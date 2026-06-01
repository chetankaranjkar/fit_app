using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using EntityInvoiceStatus = GymManagement.Domain.Entities.InvoiceStatus;

namespace GymManagement.Infrastructure.Services
{
    public sealed partial class MembershipPaymentService : IMembershipPaymentService
    {
        private readonly ApplicationDbContext _db;
        private readonly IInvoiceService _invoiceService;
        private readonly ICouponService _couponService;
        private readonly IBillingCalculationService _billing;
        private readonly IFinancialAuditService _audit;

        public MembershipPaymentService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext db,
            IInvoiceService invoiceService,
            ICouponService couponService,
            IBillingCalculationService billing,
            IFinancialAuditService audit)
        {
            _ = unitOfWork;
            _db = db;
            _invoiceService = invoiceService;
            _couponService = couponService;
            _billing = billing;
            _audit = audit;
        }

        private static bool IsTrialPlan(MembershipPlan plan)
        {
            var name = (plan.PlanName ?? string.Empty).Trim().ToLowerInvariant();
            return plan.Price <= 0m
                || plan.DurationDays <= 15
                || name.Contains("trial")
                || name.Contains("trail")
                || name.Contains("free");
        }

        private async Task<string> GeneratePaymentNumberAsync(CancellationToken ct)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"MP-{year}-";
            var last = await _db.MembershipPayments
                .IgnoreQueryFilters()
                .Where(p => p.PaymentNumber.StartsWith(prefix))
                .OrderByDescending(p => p.PaymentNumber)
                .Select(p => p.PaymentNumber)
                .FirstOrDefaultAsync(ct);
            var seq = 1;
            if (last != null && last.Length > prefix.Length && int.TryParse(last.AsSpan(prefix.Length), out var n))
                seq = n + 1;
            for (var i = 0; i < 30; i++)
            {
                var candidate = $"{prefix}{seq:D6}";
                if (!await _db.MembershipPayments.AnyAsync(p => p.PaymentNumber == candidate, ct))
                    return candidate;
                seq++;
            }
            return $"{prefix}{DateTime.UtcNow.Ticks % 1_000_000:D6}";
        }

        public async Task EnsureBillingForNewMembershipAsync(
            User user,
            UserMembership membership,
            MembershipPlan plan,
            CancellationToken cancellationToken = default)
        {
            var exists = await _db.MembershipPayments.AnyAsync(
                p => p.MembershipId == membership.Id && !p.IsDeleted,
                cancellationToken);
            if (exists)
            {
                await SyncLegacyPaymentsForMembershipAsync(membership.Id, cancellationToken);
                return;
            }

            var trial = IsTrialPlan(plan);
            var total = trial ? 0m : plan.Price;
            var header = new MembershipPayment
            {
                PaymentNumber = await GeneratePaymentNumberAsync(cancellationToken),
                UserId = user.Id,
                MembershipId = membership.Id,
                TotalAmount = total,
                OriginalAmount = total,
                FinalBillAmount = total,
                PaidAmount = 0m,
                DiscountAmount = 0,
                WaiverAmount = 0,
                PendingAmount = trial ? 0m : total,
                PaymentStatus = trial ? MembershipPaymentStatus.Paid : MembershipPaymentStatus.Pending,
                OrganizationId = user.OrganizationId ?? plan.OrganizationId,
                NextDueDate = trial
                    ? null
                    : (membership.StartDate.Date >= DateTime.UtcNow.Date
                        ? membership.StartDate.Date
                        : DateTime.UtcNow.Date),
            };
            if (trial)
            {
                membership.Status = MembershipStatus.Active;
                header.PendingAmount = 0m;
            }
            else
                membership.Status = MembershipStatus.ActivePendingPayment;

            await _db.MembershipPayments.AddAsync(header, cancellationToken);
            _db.UserMemberships.Update(membership);
            await _db.SaveChangesAsync(cancellationToken);

            if (trial)
                await CreateOrUpdateFinalInvoiceAsync(header, membership, plan, cancellationToken);

            await TryApplyLegacyPaymentTotalsAsync(header, membership, cancellationToken);
        }

        public async Task EnsureBillingForMembershipIdAsync(int membershipId, CancellationToken cancellationToken = default)
        {
            var exists = await _db.MembershipPayments.AnyAsync(
                p => p.MembershipId == membershipId && !p.IsDeleted,
                cancellationToken);
            if (exists)
            {
                await SyncLegacyPaymentsForMembershipAsync(membershipId, cancellationToken);
                return;
            }

            var membership = await _db.UserMemberships
                .Include(m => m.User)
                .Include(m => m.Plan)
                .FirstOrDefaultAsync(m => m.Id == membershipId, cancellationToken);
            if (membership == null)
                throw new NotFoundException("Membership not found.");
            if (membership.Plan == null)
                throw new BadRequestException("Membership plan is not available.");
            if (membership.User == null)
                throw new BadRequestException("Membership member is not available.");

            await EnsureBillingForNewMembershipAsync(membership.User, membership, membership.Plan, cancellationToken);
        }

        /// <summary>Maps legacy Payments rows into the billing header when billing was created after old receipts.</summary>
        private async Task TryApplyLegacyPaymentTotalsAsync(
            MembershipPayment header,
            UserMembership membership,
            CancellationToken cancellationToken)
        {
            var legacyTotal = await _db.Payments
                .Where(p => p.MembershipId == membership.Id && !p.IsDeleted)
                .SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;
            if (legacyTotal <= 0)
                return;

            ApplyLegacyPaidTotals(header, membership, legacyTotal);
            _db.MembershipPayments.Update(header);
            _db.UserMemberships.Update(membership);
            await _db.SaveChangesAsync(cancellationToken);
        }

        private async Task SyncLegacyPaymentsForMembershipAsync(int membershipId, CancellationToken cancellationToken)
        {
            var header = await _db.MembershipPayments
                .Include(p => p.Membership)
                .FirstOrDefaultAsync(p => p.MembershipId == membershipId && !p.IsDeleted, cancellationToken);
            if (header?.Membership == null)
                return;

            var legacyTotal = await _db.Payments
                .Where(p => p.MembershipId == membershipId && !p.IsDeleted)
                .SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;
            if (legacyTotal <= 0)
                return;

            var beforePaid = header.PaidAmount;
            ApplyLegacyPaidTotals(header, header.Membership, legacyTotal);
            _billing.RecalculateHeader(header);
            if (Math.Abs(beforePaid - header.PaidAmount) < 0.01m && header.PaymentStatus != MembershipPaymentStatus.Pending)
                return;

            _db.MembershipPayments.Update(header);
            _db.UserMemberships.Update(header.Membership);
            await _db.SaveChangesAsync(cancellationToken);
        }

        private void ApplyLegacyPaidTotals(MembershipPayment header, UserMembership membership, decimal legacyTotal)
        {
            _billing.RecalculateHeader(header);
            var net = _billing.GetNetPayable(header);
            header.PaidAmount = Math.Min(legacyTotal, net);
            header.PendingAmount = Math.Max(0, net - header.PaidAmount);
            if (header.PendingAmount <= 0.02m)
            {
                header.PendingAmount = 0;
                header.PaymentStatus = MembershipPaymentStatus.Paid;
                header.NextDueDate = null;
                membership.Status = MembershipStatus.Active;
            }
            else
            {
                header.PaymentStatus = MembershipPaymentStatus.Partial;
                membership.Status = MembershipStatus.PartialPayment;
                header.NextDueDate ??= DateTime.UtcNow.Date.AddDays(30);
            }
        }

        public async Task<MembershipPaymentDto?> GetByMembershipIdAsync(int membershipId, CancellationToken cancellationToken = default)
        {
            var dto = await LoadMembershipPaymentDtoAsync(membershipId, cancellationToken);
            if (dto != null)
                return dto;

            await EnsureBillingForMembershipIdAsync(membershipId, cancellationToken);
            return await LoadMembershipPaymentDtoAsync(membershipId, cancellationToken);
        }

        private async Task<MembershipPaymentDto?> LoadMembershipPaymentDtoAsync(int membershipId, CancellationToken cancellationToken)
        {
            var h = await _db.MembershipPayments.AsNoTracking()
                .Include(p => p.Transactions)
                .Include(p => p.Membership)
                .ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(p => p.MembershipId == membershipId && !p.IsDeleted, cancellationToken);
            return h == null ? null : await MapToDtoAsync(h, cancellationToken);
        }

        public async Task<IReadOnlyList<MembershipPaymentDto>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
        {
            var list = await _db.MembershipPayments.AsNoTracking()
                .Include(p => p.Transactions)
                .Include(p => p.Membership)
                .ThenInclude(m => m.Plan)
                .Where(p => p.UserId == userId && !p.IsDeleted)
                .OrderByDescending(p => p.CreatedDate)
                .ToListAsync(cancellationToken);
            var result = new List<MembershipPaymentDto>();
            foreach (var h in list)
                result.Add(await MapToDtoAsync(h, cancellationToken));
            return result;
        }

        private async Task<MembershipPaymentDto> MapToDtoAsync(MembershipPayment h, CancellationToken ct)
        {
            var staffIds = h.Transactions.Where(t => !t.IsDeleted)
                .SelectMany(t => new int?[] { t.CollectedByUserId, t.VoidedByUserId, t.RefundedByUserId })
                .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
            var names = staffIds.Count == 0
                ? new Dictionary<int, string>()
                : await _db.Users.AsNoTracking()
                    .Where(u => staffIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), ct);

            var amounts = _billing.Compute(h);
            var txList = h.Transactions.Where(t => !t.IsDeleted).OrderByDescending(t => t.TransactionDate).ToList();
            h.PaidAmount = _billing.SumCompletedPayments(txList);
            h.PendingAmount = Math.Max(0, amounts.FinalBillAmount - h.PaidAmount);
            var timeline = BuildTimeline(h, txList);
            return new MembershipPaymentDto
            {
                Id = h.Id,
                PaymentNumber = h.PaymentNumber,
                UserId = h.UserId,
                MembershipId = h.MembershipId,
                InvoiceNumber = h.InvoiceNumber,
                InvoiceId = h.InvoiceId,
                TotalAmount = h.TotalAmount,
                OriginalAmount = amounts.OriginalAmount,
                FinalBillAmount = amounts.FinalBillAmount,
                PaidAmount = h.PaidAmount,
                PendingAmount = amounts.PendingAmount,
                DiscountAmount = h.DiscountAmount,
                WaiverAmount = h.WaiverAmount,
                NetPayableAmount = amounts.FinalBillAmount,
                IsFullyPaid = h.PaymentStatus == MembershipPaymentStatus.Paid,
                IsPartiallyPaid = h.PaymentStatus == MembershipPaymentStatus.Partial,
                PaymentStatus = h.PaymentStatus,
                LastPaymentMethod = h.LastPaymentMethod,
                PaymentDate = h.PaymentDate,
                NextDueDate = h.NextDueDate,
                Notes = h.Notes,
                MembershipStatus = h.Membership.Status,
                PlanName = h.Membership.Plan?.PlanName,
                CouponId = h.CouponId,
                CouponCode = h.CouponCode,
                CouponDiscountType = h.CouponDiscountType?.ToString(),
                CouponDiscountValue = h.CouponDiscountValue,
                CouponDiscountAmount = h.CouponDiscountAmount,
                CouponLocked = h.CouponLocked,
                CouponAppliedAt = h.CouponAppliedAt,
                InstallmentCount = txList.Count,
                Transactions = txList
                    .Select(t => new MembershipPaymentTransactionDto
                    {
                        Id = t.Id,
                        ReceiptNumber = t.ReceiptNumber,
                        TransactionAmount = t.TransactionAmount,
                        TransactionMethod = t.TransactionMethod,
                        Status = t.Status,
                        ReferenceNumber = t.ReferenceNumber,
                        TransactionDate = t.TransactionDate,
                        Remarks = t.Remarks,
                        CollectedByUserId = t.CollectedByUserId,
                        CollectedByName = t.CollectedByUserId.HasValue && names.TryGetValue(t.CollectedByUserId.Value, out var n) ? n : null,
                        VoidReason = t.VoidReason,
                        VoidedByUserId = t.VoidedByUserId,
                        VoidedByName = t.VoidedByUserId.HasValue && names.TryGetValue(t.VoidedByUserId.Value, out var vn) ? vn : null,
                        VoidedDate = t.VoidedDate,
                        RefundAmount = t.RefundAmount,
                        RefundReason = t.RefundReason,
                        RefundedByUserId = t.RefundedByUserId,
                        RefundedByName = t.RefundedByUserId.HasValue && names.TryGetValue(t.RefundedByUserId.Value, out var rn) ? rn : null,
                        RefundedDate = t.RefundedDate,
                        CreatedDate = t.CreatedDate,
                    })
                    .ToList(),
                Timeline = timeline,
            };
        }

        private static IReadOnlyList<MembershipBillingTimelineEventDto> BuildTimeline(
            MembershipPayment h,
            IReadOnlyList<MembershipPaymentTransaction> transactions)
        {
            var events = new List<MembershipBillingTimelineEventDto>();
            if (h.CouponAppliedAt.HasValue && !string.IsNullOrWhiteSpace(h.CouponCode))
            {
                events.Add(new MembershipBillingTimelineEventDto
                {
                    EventType = "coupon_applied",
                    OccurredAt = h.CouponAppliedAt.Value,
                    CouponCode = h.CouponCode,
                    DiscountAmount = h.CouponDiscountAmount,
                    Label = $"Coupon applied: {h.CouponCode}",
                });
            }

            foreach (var t in transactions.OrderBy(t => t.TransactionDate))
            {
                var label = t.Status switch
                {
                    MembershipPaymentTransactionStatus.Voided => $"Voided: ₹{t.TransactionAmount:N2}",
                    MembershipPaymentTransactionStatus.Refunded => $"Refunded: ₹{t.TransactionAmount:N2}",
                    _ => $"Payment: ₹{t.TransactionAmount:N2}",
                };
                events.Add(new MembershipBillingTimelineEventDto
                {
                    EventType = t.Status == MembershipPaymentTransactionStatus.Completed ? "payment" : t.Status.ToString().ToLowerInvariant(),
                    OccurredAt = t.TransactionDate,
                    Amount = t.TransactionAmount,
                    Label = label,
                });
            }

            if (h.PaymentStatus == MembershipPaymentStatus.Paid && h.PaymentDate.HasValue)
            {
                events.Add(new MembershipBillingTimelineEventDto
                {
                    EventType = "settled",
                    OccurredAt = h.PaymentDate.Value,
                    Label = "Invoice settled",
                });
            }

            return events.OrderBy(e => e.OccurredAt).ToList();
        }

        public async Task<MembershipPaymentDto> ApplyCouponAsync(
            int membershipPaymentId,
            ApplyCouponToPaymentDto dto,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(dto.CouponCode))
                throw new BadRequestException("Coupon code is required.");

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                var membershipId = 0;
                await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var header = await _db.MembershipPayments
                        .Include(p => p.Membership)
                        .ThenInclude(m => m.Plan)
                        .FirstOrDefaultAsync(p => p.Id == membershipPaymentId && !p.IsDeleted, cancellationToken);
                    if (header == null)
                        throw new NotFoundException("Membership payment not found.");
                    if (header.Membership.Plan == null)
                        throw new BadRequestException("Membership plan is not loaded.");
                    membershipId = header.MembershipId;

                    if (header.CouponId.HasValue || header.CouponLocked)
                        throw new BadRequestException("A coupon is already applied to this invoice.");
                    var hasTransactions = await _db.MembershipPaymentTransactions
                        .AnyAsync(t => t.PaymentId == header.Id && !t.IsDeleted, cancellationToken);
                    if (header.PaidAmount > 0 || hasTransactions)
                        throw new BadRequestException("Cannot apply a coupon after payments have started.");

                    var original = header.OriginalAmount > 0 ? header.OriginalAmount : header.TotalAmount;
                    header.OriginalAmount = original;

                    var validateReq = new ValidateCouponRequest
                    {
                        CouponCode = dto.CouponCode.Trim(),
                        MembershipPlanId = header.Membership.Plan.Id,
                        InvoiceAmount = original,
                        UserId = header.UserId,
                        MembershipPaymentId = header.Id,
                    };
                    var validation = await _couponService.ValidateAsync(validateReq, cancellationToken);
                    if (!validation.Valid)
                        throw new BadRequestException(validation.Message);

                    var coupon = await _db.Coupons.AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == validation.CouponId, cancellationToken)
                        ?? throw new NotFoundException("Coupon not found.");

                    var couponDiscount = await _couponService.ApplyCouponAsync(
                        validation.CouponId!.Value,
                        header.UserId,
                        header.Id,
                        original,
                        cancellationToken);

                    header.CouponId = coupon.Id;
                    header.CouponCode = coupon.CouponCode;
                    header.CouponDiscountType = coupon.DiscountType;
                    header.CouponDiscountValue = coupon.DiscountValue;
                    header.CouponDiscountAmount = couponDiscount;
                    header.CouponAppliedAt = DateTime.UtcNow;
                    header.CouponLocked = true;
                    _billing.RecalculateHeader(header);
                    _db.MembershipPayments.Update(header);
                    await _db.SaveChangesAsync(cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                }
                catch
                {
                    await tx.RollbackAsync(cancellationToken);
                    throw;
                }

                var refreshed = await GetByMembershipIdAsync(membershipId, cancellationToken);
                return refreshed ?? throw new ConflictException("Could not reload payment after coupon apply.");
            });
        }

        public async Task<MembershipPaymentDto> RemoveCouponAsync(
            int membershipPaymentId,
            CancellationToken cancellationToken = default)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                var membershipId = 0;
                await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var header = await _db.MembershipPayments
                        .Include(p => p.Membership)
                        .FirstOrDefaultAsync(p => p.Id == membershipPaymentId && !p.IsDeleted, cancellationToken);
                    if (header == null)
                        throw new NotFoundException("Membership payment not found.");
                    membershipId = header.MembershipId;

                    if (!header.CouponId.HasValue)
                        throw new BadRequestException("No coupon is applied to this invoice.");
                    var hasTransactions = await _db.MembershipPaymentTransactions
                        .AnyAsync(t => t.PaymentId == header.Id && !t.IsDeleted, cancellationToken);
                    if (header.PaidAmount > 0 || hasTransactions)
                        throw new BadRequestException("Cannot remove coupon after payments have started.");

                    await _couponService.RevokeCouponUsageForBillingAsync(header.Id, cancellationToken);
                    header.CouponId = null;
                    header.CouponCode = null;
                    header.CouponDiscountType = null;
                    header.CouponDiscountValue = null;
                    header.CouponDiscountAmount = 0;
                    header.CouponAppliedAt = null;
                    header.CouponLocked = false;
                    _billing.RecalculateHeader(header);
                    _db.MembershipPayments.Update(header);
                    await _db.SaveChangesAsync(cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                }
                catch
                {
                    await tx.RollbackAsync(cancellationToken);
                    throw;
                }

                var refreshed = await GetByMembershipIdAsync(membershipId, cancellationToken);
                return refreshed ?? throw new ConflictException("Could not reload payment after coupon removal.");
            });
        }

        public async Task<MembershipPaymentDto> RecordInstallmentAsync(
            int membershipPaymentId,
            RecordMembershipPaymentInstallmentDto dto,
            int? staffUserId,
            CancellationToken cancellationToken = default)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                var membershipId = 0;
                await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var header = await _db.MembershipPayments
                        .Include(p => p.Membership)
                        .ThenInclude(m => m.Plan)
                        .FirstOrDefaultAsync(p => p.Id == membershipPaymentId && !p.IsDeleted, cancellationToken);
                    if (header == null)
                        throw new NotFoundException("Membership payment not found.");
                    if (header.Membership.Plan == null)
                        throw new BadRequestException("Membership plan is not loaded.");

                    membershipId = header.MembershipId;

                    if (!string.IsNullOrWhiteSpace(dto.CouponCode))
                        throw new BadRequestException("Apply coupons using the apply-coupon endpoint before recording payment.");

                    if (dto.DiscountAmount.HasValue)
                    {
                        if (header.CouponLocked || header.PaidAmount > 0)
                            throw new BadRequestException("Manual discount cannot be changed after payments or coupon lock.");
                        if (dto.DiscountAmount.Value >= 0)
                            header.DiscountAmount = dto.DiscountAmount.Value;
                    }

                    if (header.CouponId.HasValue)
                        header.CouponLocked = true;

                    _billing.RecalculateHeader(header);
                    var net = _billing.GetNetPayable(header);
                    if (dto.Amount <= 0)
                        throw new BadRequestException("Paid amount must be greater than zero.");

                    var remaining = Math.Max(0, net - header.PaidAmount);
                    if (dto.Amount - remaining > 0.02m)
                        throw new BadRequestException(
                            "Payment amount cannot exceed outstanding balance.");

                    var pendingAfter = net - header.PaidAmount - dto.Amount;
                    var isFullSettlement = pendingAfter <= 0.02m;
                    if (!isFullSettlement && !dto.NextDueDate.HasValue)
                        throw new BadRequestException("Next due date is required for partial payments.");

                    var txRow = new MembershipPaymentTransaction
                    {
                        PaymentId = header.Id,
                        ReceiptNumber = await GenerateReceiptNumberAsync(cancellationToken),
                        TransactionAmount = dto.Amount,
                        TransactionMethod = dto.Method,
                        Status = MembershipPaymentTransactionStatus.Completed,
                        ReferenceNumber = dto.ReferenceNumber?.Trim(),
                        TransactionDate = dto.TransactionDate.Kind == DateTimeKind.Unspecified
                            ? DateTime.SpecifyKind(dto.TransactionDate, DateTimeKind.Utc)
                            : dto.TransactionDate.ToUniversalTime(),
                        Remarks = dto.Remarks,
                        CollectedByUserId = staffUserId,
                    };
                    await _db.MembershipPaymentTransactions.AddAsync(txRow, cancellationToken);

                    var allTx = await _db.MembershipPaymentTransactions
                        .Where(t => t.PaymentId == header.Id && !t.IsDeleted)
                        .ToListAsync(cancellationToken);
                    allTx.Add(txRow);
                    header.PaidAmount = _billing.SumCompletedPayments(allTx);
                    header.PendingAmount = Math.Max(0, net - header.PaidAmount);
                    isFullSettlement = header.PendingAmount <= 0.02m;
                    if (isFullSettlement)
                        header.PendingAmount = 0;
                    header.LastPaymentMethod = dto.Method;
                    header.PaymentDate = txRow.TransactionDate;
                    header.ReceivedByUserId = staffUserId;

                    // Full vs partial: header PaymentStatus + membership lifecycle (see spec §4 / §16).
                    if (isFullSettlement)
                    {
                        header.PaymentStatus = MembershipPaymentStatus.Paid;
                        header.NextDueDate = null;
                        header.Membership.Status = MembershipStatus.Active;
                    }
                    else
                    {
                        header.PaymentStatus = MembershipPaymentStatus.Partial;
                        header.NextDueDate = dto.NextDueDate!.Value.Date;
                        header.Membership.Status = MembershipStatus.PartialPayment;
                    }

                    _db.MembershipPayments.Update(header);
                    _db.UserMemberships.Update(header.Membership);
                    await _db.SaveChangesAsync(cancellationToken);

                    if (isFullSettlement)
                        await CreateOrUpdateFinalInvoiceAsync(header, header.Membership, header.Membership.Plan!, cancellationToken);

                    await tx.CommitAsync(cancellationToken);

                    await _audit.LogAsync(
                        "MembershipPaymentTransaction",
                        txRow.Id,
                        "payment_recorded",
                        staffUserId,
                        header.Id,
                        header.UserId,
                        $"{{\"amount\":{dto.Amount},\"receipt\":\"{txRow.ReceiptNumber}\"}}",
                        cancellationToken);
                }
                catch
                {
                    await tx.RollbackAsync(cancellationToken);
                    throw;
                }

                // Reload only after commit — avoids SQL Server "pending local transaction" reader errors.
                var refreshed = await GetByMembershipIdAsync(membershipId, cancellationToken);
                return refreshed ?? throw new ConflictException("Could not reload payment after save.");
            });
        }

        private async Task CreateOrUpdateFinalInvoiceAsync(
            MembershipPayment header,
            UserMembership membership,
            MembershipPlan plan,
            CancellationToken ct)
        {
            if (header.InvoiceId.HasValue)
                return;

            _billing.RecalculateHeader(header);
            var original = header.OriginalAmount > 0 ? header.OriginalAmount : header.TotalAmount;
            var final = _billing.GetNetPayable(header);
            var inv = new Invoice
            {
                InvoiceNumber = await GenerateInvoiceNumberAsync(ct),
                UserMembershipId = membership.Id,
                IssueDate = DateTime.UtcNow,
                DueDate = header.NextDueDate ?? DateTime.UtcNow.Date,
                PaidDate = DateTime.UtcNow,
                Subtotal = original,
                TaxAmount = 0,
                DiscountAmount = header.DiscountAmount + header.CouponDiscountAmount,
                TotalAmount = final,
                Currency = "INR",
                Status = EntityInvoiceStatus.Paid,
                CouponCode = header.CouponCode,
                CouponDiscountAmount = header.CouponDiscountAmount,
                Notes = $"Membership billing {header.PaymentNumber}. Plan: {plan.PlanName}." +
                    (header.CouponCode != null ? $" Coupon applied: {header.CouponCode} (−₹{header.CouponDiscountAmount:N2})." : ""),
                OrganizationId = header.OrganizationId,
                InvoiceItems =
                {
                    new InvoiceItem
                    {
                        Description = $"Membership — {plan.PlanName}",
                        Quantity = 1,
                        Unit = "membership",
                        UnitPrice = original,
                        Total = original,
                    },
                },
            };

            await _db.Invoices.AddAsync(inv, ct);
            await _db.SaveChangesAsync(ct);

            header.InvoiceId = inv.Id;
            header.InvoiceNumber = inv.InvoiceNumber;
            _db.MembershipPayments.Update(header);
            await _db.SaveChangesAsync(ct);
        }

        private async Task<string> GenerateInvoiceNumberAsync(CancellationToken ct)
        {
            var year = DateTime.UtcNow.Year;
            var count = await _db.Invoices.CountAsync(i => i.CreatedDate.Year == year, ct);
            return $"INV-{year}-{(count + 1):D6}";
        }

        public async Task<MembershipPaymentDashboardDto> GetDashboardSummaryAsync(CancellationToken cancellationToken = default)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var pending = await _db.MembershipPayments.AsNoTracking()
                .Where(p => !p.IsDeleted && p.PaymentStatus != MembershipPaymentStatus.Paid)
                .ToListAsync(cancellationToken);
            return new MembershipPaymentDashboardDto
            {
                PendingPaymentsCount = pending.Count,
                TotalPendingAmount = pending.Sum(p => p.PendingAmount),
                OverdueMembersCount = pending.Count(p => p.PaymentStatus == MembershipPaymentStatus.Overdue),
                TodayCollections = await _db.MembershipPaymentTransactions.AsNoTracking()
                    .Where(t => !t.IsDeleted
                                && t.Status == MembershipPaymentTransactionStatus.Completed
                                && t.TransactionDate >= today && t.TransactionDate < tomorrow)
                    .SumAsync(t => t.TransactionAmount, cancellationToken),
                UpcomingDueCount = pending.Count(p =>
                    p.NextDueDate.HasValue && p.NextDueDate.Value.Date <= today.AddDays(7) && p.PendingAmount > 0),
                PartialMembersCount = pending.Count(p => p.PaymentStatus == MembershipPaymentStatus.Partial),
            };
        }

        public async Task<int> RefreshOverdueStatusesAsync(CancellationToken cancellationToken = default)
        {
            var today = DateTime.UtcNow.Date;
            var list = await _db.MembershipPayments
                .Where(p => !p.IsDeleted
                            && p.PendingAmount > 0
                            && p.PaymentStatus != MembershipPaymentStatus.Paid
                            && p.NextDueDate.HasValue
                            && p.NextDueDate.Value.Date < today)
                .ToListAsync(cancellationToken);
            foreach (var p in list)
                p.PaymentStatus = MembershipPaymentStatus.Overdue;
            if (list.Count > 0)
                await _db.SaveChangesAsync(cancellationToken);
            return list.Count;
        }

        public async Task<int> CreateDueDateNotificationsAsync(CancellationToken cancellationToken = default)
        {
            var today = DateTime.UtcNow.Date;
            var due = await _db.MembershipPayments
                .Include(p => p.User)
                .Where(p => !p.IsDeleted
                            && p.PendingAmount > 0
                            && p.NextDueDate.HasValue
                            && p.NextDueDate.Value.Date <= today
                            && (p.DueReminderLastSentAt == null || p.DueReminderLastSentAt.Value.Date < today))
                .ToListAsync(cancellationToken);

            var n = 0;
            foreach (var p in due)
            {
                var name = $"{p.User.FirstName} {p.User.LastName}".Trim();
                var msg = $"Payment pending for member {name}. Due amount ₹{p.PendingAmount:N2}.";
                await _db.Notifications.AddAsync(new Notification
                {
                    UserId = p.UserId,
                    Title = "Payment due",
                    Message = msg,
                    NotificationType = "payment_due",
                    CreatedDate = DateTime.UtcNow,
                    IsRead = false,
                }, cancellationToken);
                p.DueReminderLastSentAt = DateTime.UtcNow;
                n++;
            }

            if (n > 0)
                await _db.SaveChangesAsync(cancellationToken);
            return n;
        }

        public async Task MarkReminderSentAsync(int membershipPaymentId, CancellationToken cancellationToken = default)
        {
            var p = await _db.MembershipPayments.FirstOrDefaultAsync(x => x.Id == membershipPaymentId && !x.IsDeleted, cancellationToken);
            if (p == null)
                throw new NotFoundException("Payment record not found.");
            p.DueReminderLastSentAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> IsMemberAccessBlockedAsync(int userId, CancellationToken cancellationToken = default)
        {
            var access = await GetMemberBillingAccessAsync(userId, cancellationToken);
            return access.AccessBlocked;
        }

        public async Task<MemberBillingAccessDto> GetMemberBillingAccessAsync(int userId, CancellationToken cancellationToken = default)
        {
            var headers = await _db.MembershipPayments.AsNoTracking()
                .Where(p => p.UserId == userId && !p.IsDeleted && p.PaymentStatus != MembershipPaymentStatus.Paid && p.PendingAmount > 0)
                .OrderByDescending(p => p.CreatedDate)
                .ToListAsync(cancellationToken);
            MembershipPayment? block = null;
            foreach (var h in headers)
            {
                if (h.PaymentStatus == MembershipPaymentStatus.Overdue
                    || (h.NextDueDate.HasValue && h.NextDueDate.Value.Date < DateTime.UtcNow.Date))
                {
                    block = h;
                    break;
                }
            }

            if (block == null)
                return new MemberBillingAccessDto { AccessBlocked = false };

            return new MemberBillingAccessDto
            {
                AccessBlocked = true,
                PendingAmount = block.PendingAmount,
                NextDueDate = block.NextDueDate,
                Message = "Your membership payment is pending. Please contact gym administration.",
                MembershipPaymentId = block.Id,
            };
        }

        public async Task<byte[]?> GetInvoicePdfForMembershipPaymentAsync(int membershipPaymentId, CancellationToken cancellationToken = default)
        {
            var header = await _db.MembershipPayments.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == membershipPaymentId && !p.IsDeleted, cancellationToken);
            if (header?.InvoiceId == null)
                return null;
            return await _invoiceService.GeneratePdfBytesAsync(header.InvoiceId.Value);
        }
    }
}
