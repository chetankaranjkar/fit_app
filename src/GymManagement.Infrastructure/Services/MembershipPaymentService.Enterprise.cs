using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed partial class MembershipPaymentService
    {
        public async Task<MembershipFinancialSummaryDto?> GetFinancialSummaryByMembershipIdAsync(
            int membershipId,
            CancellationToken cancellationToken = default)
        {
            var dto = await GetByMembershipIdAsync(membershipId, cancellationToken);
            if (dto == null) return null;

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.UserId, cancellationToken);
            return new MembershipFinancialSummaryDto
            {
                UserId = dto.UserId,
                MemberName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : null,
                MemberPhotoUrl = user?.ProfilePictureUrl,
                MemberCode = user != null ? $"M-{user.Id:D5}" : null,
                PlanName = dto.PlanName,
                MembershipFee = dto.OriginalAmount > 0 ? dto.OriginalAmount : dto.TotalAmount,
                CouponDiscount = dto.CouponDiscountAmount,
                ApprovedWaiveOff = dto.WaiverAmount,
                NetPayableAmount = dto.NetPayableAmount,
                TotalPaid = dto.PaidAmount,
                OutstandingBalance = dto.PendingAmount,
                IsFullyPaid = dto.IsFullyPaid,
                IsOverdue = dto.PaymentStatus == MembershipPaymentStatus.Overdue,
            };
        }

        public async Task<DuplicatePaymentCheckDto> CheckDuplicatePaymentAsync(
            int membershipPaymentId,
            decimal amount,
            CancellationToken cancellationToken = default)
        {
            var since = DateTime.UtcNow.AddMinutes(-2);
            var dup = await _db.MembershipPaymentTransactions.AsNoTracking()
                .Include(t => t.Payment)
                .Where(t => !t.IsDeleted
                            && t.PaymentId == membershipPaymentId
                            && t.Status == MembershipPaymentTransactionStatus.Completed
                            && t.TransactionAmount == amount
                            && t.TransactionDate >= since)
                .OrderByDescending(t => t.TransactionDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (dup == null)
                return new DuplicatePaymentCheckDto { IsDuplicate = false };

            return new DuplicatePaymentCheckDto
            {
                IsDuplicate = true,
                ExistingTransactionId = dup.Id,
                Message = "Similar payment detected. Please verify before continuing.",
            };
        }

        public async Task<IReadOnlyList<MembershipPaymentTransactionListDto>> ListTransactionsAsync(
            MembershipPaymentTransactionQuery query,
            CancellationToken cancellationToken = default)
        {
            var q = _db.MembershipPaymentTransactions.AsNoTracking()
                .Include(t => t.Payment).ThenInclude(p => p.User)
                .Include(t => t.Payment).ThenInclude(p => p.Membership).ThenInclude(m => m.Plan)
                .Where(t => !t.IsDeleted);

            if (query.FromDate.HasValue)
            {
                var from = query.FromDate.Value.Date;
                q = q.Where(t => t.TransactionDate >= from);
            }
            if (query.ToDate.HasValue)
            {
                var to = query.ToDate.Value.Date.AddDays(1);
                q = q.Where(t => t.TransactionDate < to);
            }
            if (query.Status.HasValue)
                q = q.Where(t => t.Status == query.Status.Value);
            if (query.UserId.HasValue)
                q = q.Where(t => t.Payment.UserId == query.UserId.Value);
            if (query.Method.HasValue)
                q = q.Where(t => t.TransactionMethod == query.Method.Value);

            var rows = await q.OrderByDescending(t => t.TransactionDate).Take(500).ToListAsync(cancellationToken);
            var staffIds = rows.Select(t => t.CollectedByUserId).Where(id => id.HasValue).Select(id => id!.Value).Distinct();
            var names = await _db.Users.AsNoTracking()
                .Where(u => staffIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), cancellationToken);

            return rows.Select(t => new MembershipPaymentTransactionListDto
            {
                Id = t.Id,
                PaymentId = t.PaymentId,
                UserId = t.Payment.UserId,
                MemberName = $"{t.Payment.User.FirstName} {t.Payment.User.LastName}".Trim(),
                MemberPhotoUrl = t.Payment.User.ProfilePictureUrl,
                ReceiptNumber = t.ReceiptNumber,
                TransactionAmount = t.TransactionAmount,
                TransactionMethod = t.TransactionMethod,
                Status = t.Status,
                TransactionDate = t.TransactionDate,
                ReferenceNumber = t.ReferenceNumber,
                Remarks = t.Remarks,
                CollectedByUserId = t.CollectedByUserId,
                CollectedByName = t.CollectedByUserId.HasValue && names.TryGetValue(t.CollectedByUserId.Value, out var n) ? n : null,
                PlanName = t.Payment.Membership.Plan?.PlanName,
            }).ToList();
        }

        public async Task<MembershipPaymentDto> VoidTransactionAsync(
            int transactionId,
            VoidPaymentTransactionDto dto,
            int staffUserId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(dto.VoidReason))
                throw new BadRequestException("Void reason is required.");

            var tx = await _db.MembershipPaymentTransactions
                .Include(t => t.Payment).ThenInclude(p => p.Membership).ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(t => t.Id == transactionId && !t.IsDeleted, cancellationToken)
                ?? throw new NotFoundException("Payment transaction not found.");

            if (tx.Status != MembershipPaymentTransactionStatus.Completed)
                throw new BadRequestException("Only completed payments can be voided.");

            tx.Status = MembershipPaymentTransactionStatus.Voided;
            tx.VoidReason = dto.VoidReason.Trim();
            tx.VoidedByUserId = staffUserId;
            tx.VoidedDate = DateTime.UtcNow;
            tx.ModifiedByUserId = staffUserId;
            tx.UpdatedDate = DateTime.UtcNow;

            var header = tx.Payment;
            var allTx = await _db.MembershipPaymentTransactions
                .Where(t => t.PaymentId == header.Id && !t.IsDeleted)
                .ToListAsync(cancellationToken);
            _billing.ApplyPaidAndPending(header, allTx);
            if (header.PendingAmount > 0.02m && header.Membership.Status == MembershipStatus.Active)
                header.Membership.Status = MembershipStatus.PartialPayment;

            await _db.SaveChangesAsync(cancellationToken);
            await LogAuditAsync("MembershipPaymentTransaction", tx.Id, "voided", staffUserId, header.Id, header.UserId,
                JsonSerializer.Serialize(new { dto.VoidReason }), cancellationToken);

            return (await GetByMembershipIdAsync(header.MembershipId, cancellationToken))!;
        }

        public async Task<MembershipPaymentDto> RefundTransactionAsync(
            int transactionId,
            RefundPaymentTransactionDto dto,
            int staffUserId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(dto.RefundReason))
                throw new BadRequestException("Refund reason is required.");
            if (dto.RefundAmount <= 0)
                throw new BadRequestException("Refund amount must be greater than zero.");

            var tx = await _db.MembershipPaymentTransactions
                .Include(t => t.Payment).ThenInclude(p => p.Membership).ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(t => t.Id == transactionId && !t.IsDeleted, cancellationToken)
                ?? throw new NotFoundException("Payment transaction not found.");

            if (tx.Status != MembershipPaymentTransactionStatus.Completed)
                throw new BadRequestException("Only completed payments can be refunded.");

            if (dto.RefundAmount - tx.TransactionAmount > 0.02m)
                throw new BadRequestException("Refund amount cannot exceed the original payment amount.");

            tx.Status = MembershipPaymentTransactionStatus.Refunded;
            tx.RefundAmount = dto.RefundAmount;
            tx.RefundReason = dto.RefundReason.Trim();
            tx.RefundedByUserId = staffUserId;
            tx.RefundedDate = DateTime.UtcNow;
            tx.ModifiedByUserId = staffUserId;
            tx.UpdatedDate = DateTime.UtcNow;

            var header = tx.Payment;
            var allTx = await _db.MembershipPaymentTransactions
                .Where(t => t.PaymentId == header.Id && !t.IsDeleted)
                .ToListAsync(cancellationToken);
            _billing.ApplyPaidAndPending(header, allTx);
            if (header.PendingAmount > 0.02m && header.Membership.Status == MembershipStatus.Active)
                header.Membership.Status = MembershipStatus.PartialPayment;

            await _db.SaveChangesAsync(cancellationToken);
            await LogAuditAsync("MembershipPaymentTransaction", tx.Id, "refunded", staffUserId, header.Id, header.UserId,
                JsonSerializer.Serialize(new { dto.RefundAmount, dto.RefundReason }), cancellationToken);

            return (await GetByMembershipIdAsync(header.MembershipId, cancellationToken))!;
        }

        public async Task<EnterpriseBillingDashboardDto> GetEnterpriseDashboardAsync(CancellationToken cancellationToken = default)
        {
            var basic = await GetDashboardSummaryAsync(cancellationToken);
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var headers = await _db.MembershipPayments.AsNoTracking().Where(p => !p.IsDeleted).ToListAsync(cancellationToken);
            var completedTx = await _db.MembershipPaymentTransactions.AsNoTracking()
                .Where(t => !t.IsDeleted && t.Status == MembershipPaymentTransactionStatus.Completed)
                .ToListAsync(cancellationToken);

            var outstanding = headers.Where(p => p.PendingAmount > 0.02m).ToList();
            var topDefaulters = outstanding
                .OrderByDescending(p => p.PendingAmount)
                .Take(10)
                .Select(p => new { p.UserId, p.PendingAmount, p.NextDueDate, p.MembershipId })
                .ToList();
            var userIds = topDefaulters.Select(x => x.UserId).Distinct().ToList();
            var users = await _db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, cancellationToken);

            var defaulterDtos = new List<MemberOutstandingDto>();
            foreach (var d in topDefaulters)
            {
                users.TryGetValue(d.UserId, out var u);
                var plan = await _db.MembershipPayments.AsNoTracking()
                    .Include(p => p.Membership).ThenInclude(m => m.Plan)
                    .Where(p => p.MembershipId == d.MembershipId)
                    .Select(p => p.Membership.Plan!.PlanName)
                    .FirstOrDefaultAsync(cancellationToken);
                defaulterDtos.Add(new MemberOutstandingDto
                {
                    UserId = d.UserId,
                    MemberName = u != null ? $"{u.FirstName} {u.LastName}".Trim() : $"User {d.UserId}",
                    ProfilePictureUrl = u?.ProfilePictureUrl,
                    OutstandingBalance = d.PendingAmount,
                    NextDueDate = d.NextDueDate,
                    PlanName = plan,
                });
            }

            return new EnterpriseBillingDashboardDto
            {
                TotalMembershipRevenue = headers.Sum(h => h.OriginalAmount > 0 ? h.OriginalAmount : h.TotalAmount),
                TotalPaymentsReceived = completedTx.Sum(t => t.TransactionAmount),
                OutstandingDues = outstanding.Sum(p => p.PendingAmount),
                TotalCouponDiscounts = headers.Sum(h => h.CouponDiscountAmount),
                TotalApprovedWaiveOff = headers.Sum(h => h.WaiverAmount),
                PendingWaiveOffRequests = await _db.WaiveOffRequests.CountAsync(
                    w => !w.IsDeleted && w.Status == WaiveOffRequestStatus.Pending, cancellationToken),
                VoidedPaymentsCount = await _db.MembershipPaymentTransactions.CountAsync(
                    t => !t.IsDeleted && t.Status == MembershipPaymentTransactionStatus.Voided, cancellationToken),
                RefundedPaymentsCount = await _db.MembershipPaymentTransactions.CountAsync(
                    t => !t.IsDeleted && t.Status == MembershipPaymentTransactionStatus.Refunded, cancellationToken),
                MonthlyCollections = completedTx
                    .Where(t => t.TransactionDate >= monthStart && t.TransactionDate < tomorrow)
                    .Sum(t => t.TransactionAmount),
                DailyCollections = completedTx
                    .Where(t => t.TransactionDate >= today && t.TransactionDate < tomorrow)
                    .Sum(t => t.TransactionAmount),
                TopDefaulters = defaulterDtos,
                PendingPaymentsCount = basic.PendingPaymentsCount,
                TotalPendingAmount = basic.TotalPendingAmount,
                OverdueMembersCount = basic.OverdueMembersCount,
                TodayCollections = basic.TodayCollections,
            };
        }

        public async Task<MemberLedgerDto> GetMemberLedgerAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                ?? throw new NotFoundException("Member not found.");
            var payments = await GetByUserIdAsync(userId, cancellationToken);
            var periods = payments.Select(p => new MemberLedgerPeriodDto
            {
                MembershipPaymentId = p.Id,
                PlanName = p.PlanName,
                MembershipFee = p.OriginalAmount > 0 ? p.OriginalAmount : p.TotalAmount,
                CouponDiscount = p.CouponDiscountAmount,
                ApprovedWaiveOff = p.WaiverAmount,
                NetPayable = p.NetPayableAmount,
                TotalPaid = p.PaidAmount,
                OutstandingBalance = p.PendingAmount,
                Payments = p.Transactions,
            }).ToList();

            return new MemberLedgerDto
            {
                UserId = userId,
                MemberName = $"{user.FirstName} {user.LastName}".Trim(),
                ProfilePictureUrl = user.ProfilePictureUrl,
                Periods = periods,
            };
        }

        public async Task<BillingReportDto> GetReportAsync(
            string reportType,
            DateTime fromDate,
            DateTime toDate,
            CancellationToken cancellationToken = default)
        {
            var from = fromDate.Date;
            var to = toDate.Date.AddDays(1);
            var type = (reportType ?? "").Trim().ToLowerInvariant();

            if (type is "coupon" or "coupon-discount" or "coupons")
            {
                var headers = await _db.MembershipPayments.AsNoTracking()
                    .Include(p => p.User)
                    .Where(p => !p.IsDeleted
                                && p.CouponDiscountAmount > 0
                                && p.CreatedDate >= from
                                && p.CreatedDate < to)
                    .OrderBy(p => p.CreatedDate)
                    .ToListAsync(cancellationToken);
                return new BillingReportDto
                {
                    ReportType = reportType,
                    FromDate = from,
                    ToDate = toDate.Date,
                    TotalAmount = headers.Sum(h => h.CouponDiscountAmount),
                    RecordCount = headers.Count,
                    Lines = headers.Select(h => new BillingReportLineDto
                    {
                        Date = h.CouponAppliedAt ?? h.CreatedDate,
                        ReceiptNumber = h.PaymentNumber,
                        MemberName = $"{h.User.FirstName} {h.User.LastName}".Trim(),
                        Amount = h.CouponDiscountAmount,
                        Notes = h.CouponCode,
                        Status = h.PaymentStatus.ToString(),
                    }).ToList(),
                };
            }

            if (type is "waive-off" or "waiveoff" or "waive-offs")
            {
                var waiveRows = await _db.WaiveOffRequests.AsNoTracking()
                    .Include(w => w.User)
                    .Where(w => !w.IsDeleted
                                && w.Status == WaiveOffRequestStatus.Approved
                                && w.ApprovedDate >= from
                                && w.ApprovedDate < to)
                    .OrderBy(w => w.ApprovedDate)
                    .ToListAsync(cancellationToken);
                return new BillingReportDto
                {
                    ReportType = reportType,
                    FromDate = from,
                    ToDate = toDate.Date,
                    TotalAmount = waiveRows.Sum(w => w.RequestedAmount),
                    RecordCount = waiveRows.Count,
                    Lines = waiveRows.Select(w => new BillingReportLineDto
                    {
                        Date = w.ApprovedDate ?? w.RequestedDate,
                        MemberName = $"{w.User.FirstName} {w.User.LastName}".Trim(),
                        Amount = w.RequestedAmount,
                        Status = w.Status.ToString(),
                        Notes = w.Reason,
                    }).ToList(),
                };
            }

            if (type is "outstanding" or "outstanding-dues")
            {
                var headers = await _db.MembershipPayments.AsNoTracking()
                    .Include(p => p.User)
                    .Where(p => !p.IsDeleted && p.PendingAmount > 0.02m)
                    .ToListAsync(cancellationToken);
                return new BillingReportDto
                {
                    ReportType = reportType,
                    FromDate = from,
                    ToDate = toDate.Date,
                    TotalAmount = headers.Sum(h => h.PendingAmount),
                    RecordCount = headers.Count,
                    Lines = headers.Select(h => new BillingReportLineDto
                    {
                        Date = h.NextDueDate ?? h.CreatedDate,
                        MemberName = $"{h.User.FirstName} {h.User.LastName}".Trim(),
                        Amount = h.PendingAmount,
                        Status = h.PaymentStatus.ToString(),
                    }).ToList(),
                };
            }

            var txQ = _db.MembershipPaymentTransactions.AsNoTracking()
                .Include(t => t.Payment).ThenInclude(p => p.User)
                .Where(t => !t.IsDeleted && t.TransactionDate >= from && t.TransactionDate < to);

            txQ = type switch
            {
                "voided" => txQ.Where(t => t.Status == MembershipPaymentTransactionStatus.Voided),
                "refund" or "refunds" => txQ.Where(t => t.Status == MembershipPaymentTransactionStatus.Refunded),
                _ => txQ.Where(t => t.Status == MembershipPaymentTransactionStatus.Completed),
            };

            var txs = await txQ.OrderBy(t => t.TransactionDate).ToListAsync(cancellationToken);
            return new BillingReportDto
            {
                ReportType = reportType,
                FromDate = from,
                ToDate = toDate.Date,
                TotalAmount = txs.Sum(t => t.TransactionAmount),
                RecordCount = txs.Count,
                Lines = txs.Select(t => new BillingReportLineDto
                {
                    Date = t.TransactionDate,
                    ReceiptNumber = t.ReceiptNumber,
                    MemberName = $"{t.Payment.User.FirstName} {t.Payment.User.LastName}".Trim(),
                    Amount = t.TransactionAmount,
                    Method = t.TransactionMethod.ToString(),
                    Status = t.Status.ToString(),
                    Notes = t.Remarks,
                }).ToList(),
            };
        }

        public async Task<IReadOnlyList<FinancialAuditLogDto>> GetAuditLogsAsync(
            int? membershipPaymentId,
            int? userId,
            int take,
            CancellationToken cancellationToken = default)
        {
            take = Math.Clamp(take, 1, 200);
            var q = _db.FinancialAuditLogs.AsNoTracking().Where(l => !l.IsDeleted);
            if (membershipPaymentId.HasValue)
                q = q.Where(l => l.MembershipPaymentId == membershipPaymentId.Value);
            if (userId.HasValue)
                q = q.Where(l => l.UserId == userId.Value);

            var logs = await q.OrderByDescending(l => l.CreatedDate).Take(take).ToListAsync(cancellationToken);
            var actorIds = logs.Where(l => l.ActorUserId.HasValue).Select(l => l.ActorUserId!.Value).Distinct().ToList();
            var names = await _db.Users.AsNoTracking()
                .Where(u => actorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), cancellationToken);

            return logs.Select(l => new FinancialAuditLogDto
            {
                Id = l.Id,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                Action = l.Action,
                ActorUserId = l.ActorUserId,
                ActorName = l.ActorUserId.HasValue && names.TryGetValue(l.ActorUserId.Value, out var n) ? n : null,
                CreatedDate = l.CreatedDate,
                DetailsJson = l.DetailsJson,
                MembershipPaymentId = l.MembershipPaymentId,
                UserId = l.UserId,
            }).ToList();
        }

        private async Task<string> GenerateReceiptNumberAsync(CancellationToken ct)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"RCP-{year}-";
            var last = await _db.MembershipPaymentTransactions
                .IgnoreQueryFilters()
                .Where(t => t.ReceiptNumber.StartsWith(prefix))
                .OrderByDescending(t => t.ReceiptNumber)
                .Select(t => t.ReceiptNumber)
                .FirstOrDefaultAsync(ct);
            var seq = 1;
            if (last != null && last.Length > prefix.Length && int.TryParse(last.AsSpan(prefix.Length), out var n))
                seq = n + 1;
            return $"{prefix}{seq:D6}";
        }

        private async Task LogAuditAsync(
            string entityType,
            int entityId,
            string action,
            int? actorUserId,
            int? membershipPaymentId,
            int? userId,
            string? detailsJson,
            CancellationToken ct)
        {
            await _audit.LogAsync(entityType, entityId, action, actorUserId, membershipPaymentId, userId, detailsJson, ct);
        }
    }
}
