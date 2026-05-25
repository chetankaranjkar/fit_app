using GymManagement.Core.DTOs.Common;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class MemberPtPackageService : IMemberPtPackageService
    {
        private readonly ApplicationDbContext _db;
        private readonly ITrainerCommissionService _commissionService;

        public MemberPtPackageService(ApplicationDbContext db, ITrainerCommissionService commissionService)
        {
            _db = db;
            _commissionService = commissionService;
        }

        public async Task<PagedResultDto<MemberPTPackageDto>> SearchAsync(MemberPTPackageFilterDto filter, CancellationToken ct = default)
        {
            var page = Math.Max(1, filter.Page);
            var pageSize = Math.Clamp(filter.PageSize, 1, 100);
            var query = BuildMemberQuery(filter);
            var total = await query.CountAsync(ct);
            var rows = await query.OrderByDescending(m => m.CreatedDate)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
            return new PagedResultDto<MemberPTPackageDto>
            {
                Items = rows.Select(Map).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<MemberPTPackageDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var m = await BuildMemberQuery(new MemberPTPackageFilterDto()).FirstOrDefaultAsync(x => x.Id == id, ct);
            return m == null ? null : Map(m);
        }

        public async Task<MemberPTPackageDto> AssignAsync(AssignPTPackageDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            var package = await _db.PTPackages.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.PackageId && !p.IsDeleted && p.IsActive, ct)
                ?? throw new NotFoundException("PT package not found or inactive.");

            var trainer = await _db.Trainers.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == dto.TrainerId && !t.IsDeleted, ct)
                ?? throw new NotFoundException("Trainer not found.");

            var user = await _db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == dto.UserId && !u.IsDeleted, ct)
                ?? throw new NotFoundException("Member not found.");

            var trainerPrice = await _db.PTPackagePrices.AsNoTracking()
                .FirstOrDefaultAsync(tp => tp.PackageId == dto.PackageId && tp.TrainerId == dto.TrainerId && !tp.IsDeleted && tp.IsActive, ct);

            var unitPrice = trainerPrice?.Price ?? package.Price;
            var discount = dto.DiscountAmount ?? package.DefaultDiscountAmount;
            var subtotal = Math.Max(0, unitPrice - discount);
            var tax = Math.Round(subtotal * package.TaxPercentage / 100m, 2);
            var total = subtotal + tax;

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                var invoiceNumber = await GenerateInvoiceNumberAsync(ct);

                var invoice = new PTPackageInvoice
                {
                    InvoiceNumber = invoiceNumber,
                    Category = InvoiceCategoryType.PTPackage,
                    UserId = dto.UserId,
                    TrainerId = dto.TrainerId,
                    PackageId = dto.PackageId,
                    SessionCount = package.TotalSessions,
                    ValidityDays = package.ValidityDays,
                    Subtotal = subtotal,
                    TaxAmount = tax,
                    DiscountAmount = discount,
                    CouponCode = dto.CouponCode,
                    TotalAmount = total,
                    PaidAmount = 0,
                    PaymentStatus = PTPaymentStatus.Pending,
                    Notes = dto.Notes,
                };
                await _db.PTPackageInvoices.AddAsync(invoice, ct);
                await _db.SaveChangesAsync(ct);

                var start = DateTime.UtcNow.Date;
                var memberPkg = new MemberPTPackage
                {
                    UserId = dto.UserId,
                    TrainerId = dto.TrainerId,
                    PackageId = dto.PackageId,
                    PTPackageInvoiceId = invoice.Id,
                    InvoiceNumber = invoiceNumber,
                    TotalSessions = package.TotalSessions,
                    RemainingSessions = package.TotalSessions,
                    StartDate = start,
                    ExpiryDate = start.AddDays(package.ValidityDays),
                    Status = MemberPTPackageStatus.PendingPayment,
                    Subtotal = subtotal,
                    TaxAmount = tax,
                    DiscountAmount = discount,
                    TotalAmount = total,
                    PaidAmount = 0,
                    PaymentStatus = PTPaymentStatus.Pending,
                    CouponCode = dto.CouponCode,
                    Notes = dto.Notes,
                };
                await _db.MemberPTPackages.AddAsync(memberPkg, ct);
                await _db.SaveChangesAsync(ct);

                invoice.MemberPackage = memberPkg;
                await AddHistoryAsync(memberPkg.Id, MemberPTPackageHistoryAction.Purchased, null, memberPkg.RemainingSessions, memberPkg.ExpiryDate, performedByUserId, "Package assigned", ct);

                if (dto.PaidAmount is > 0)
                    await RecordPaymentInternalAsync(memberPkg, dto.PaidAmount.Value, performedByUserId, ct);

                await tx.CommitAsync(ct);
                return (await GetByIdAsync(memberPkg.Id, ct))!;
            });
        }

        public async Task<MemberPTPackageDto?> RecordPaymentAsync(int id, decimal amount, CancellationToken ct = default)
        {
            var m = await _db.MemberPTPackages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (m == null) return null;
            await RecordPaymentInternalAsync(m, amount, null, ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task<MemberPTPackageDto?> FreezeAsync(int id, FreezePTPackageDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            var m = await _db.MemberPTPackages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (m == null) return null;
            if (m.Status != MemberPTPackageStatus.Active)
                throw new BadRequestException("Only active packages can be frozen.");
            m.Status = MemberPTPackageStatus.Frozen;
            m.FrozenUntil = dto.FrozenUntil.ToUniversalTime();
            m.UpdatedDate = DateTime.UtcNow;
            await AddHistoryAsync(m.Id, MemberPTPackageHistoryAction.Frozen, null, m.RemainingSessions, m.ExpiryDate, performedByUserId, dto.Notes, ct);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task<MemberPTPackageDto?> UnfreezeAsync(int id, int? performedByUserId, CancellationToken ct = default)
        {
            var m = await _db.MemberPTPackages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (m == null) return null;
            if (m.Status != MemberPTPackageStatus.Frozen)
                throw new BadRequestException("Package is not frozen.");
            if (m.FrozenUntil.HasValue && m.FrozenUntil.Value > DateTime.UtcNow)
                m.ExpiryDate = m.ExpiryDate.Add(m.FrozenUntil.Value - DateTime.UtcNow);
            m.Status = MemberPTPackageStatus.Active;
            m.FrozenUntil = null;
            m.UpdatedDate = DateTime.UtcNow;
            await AddHistoryAsync(m.Id, MemberPTPackageHistoryAction.Unfrozen, null, m.RemainingSessions, m.ExpiryDate, performedByUserId, null, ct);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task<MemberPTPackageDto?> ExtendAsync(int id, ExtendPTPackageDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            var m = await _db.MemberPTPackages.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (m == null) return null;
            m.ExpiryDate = m.ExpiryDate.AddDays(dto.AdditionalDays);
            if (dto.AdditionalSessions is > 0)
            {
                m.TotalSessions += dto.AdditionalSessions.Value;
                m.RemainingSessions += dto.AdditionalSessions.Value;
            }
            m.UpdatedDate = DateTime.UtcNow;
            await AddHistoryAsync(m.Id, MemberPTPackageHistoryAction.Extended, dto.AdditionalSessions, m.RemainingSessions, m.ExpiryDate, performedByUserId, dto.Notes, ct);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        private async Task RecordPaymentInternalAsync(MemberPTPackage m, decimal amount, int? performedByUserId, CancellationToken ct)
        {
            if (amount <= 0) throw new BadRequestException("Payment amount must be positive.");
            m.PaidAmount = Math.Min(m.TotalAmount, m.PaidAmount + amount);
            m.PaymentStatus = m.PaidAmount >= m.TotalAmount ? PTPaymentStatus.Paid : PTPaymentStatus.Partial;
            if (m.PaymentStatus == PTPaymentStatus.Paid)
            {
                m.Status = MemberPTPackageStatus.Active;
                var invoice = await _db.PTPackageInvoices.FirstOrDefaultAsync(i => i.Id == m.PTPackageInvoiceId, ct);
                if (invoice != null)
                {
                    invoice.PaidAmount = m.PaidAmount;
                    invoice.PaymentStatus = PTPaymentStatus.Paid;
                    invoice.PaidDate = DateTime.UtcNow;
                }
                await _commissionService.AccruePackageCommissionAsync(m, ct);
            }
            m.UpdatedDate = DateTime.UtcNow;
            await AddHistoryAsync(m.Id, MemberPTPackageHistoryAction.PaymentReceived, null, m.RemainingSessions, m.ExpiryDate, performedByUserId, $"Paid {amount}", ct);
            await _db.SaveChangesAsync(ct);
        }

        private IQueryable<MemberPTPackage> BuildMemberQuery(MemberPTPackageFilterDto filter)
        {
            var query = _db.MemberPTPackages.AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Trainer).ThenInclude(t => t.User)
                .Include(m => m.Package)
                .Where(m => !m.IsDeleted);

            if (filter.UserId.HasValue) query = query.Where(m => m.UserId == filter.UserId);
            if (filter.TrainerId.HasValue) query = query.Where(m => m.TrainerId == filter.TrainerId);
            if (filter.Status.HasValue) query = query.Where(m => m.Status == filter.Status);
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var s = filter.Search.Trim().ToLower();
                query = query.Where(m =>
                    m.User.FirstName.ToLower().Contains(s) ||
                    m.User.LastName.ToLower().Contains(s) ||
                    m.Package.PackageName.ToLower().Contains(s) ||
                    (m.InvoiceNumber != null && m.InvoiceNumber.ToLower().Contains(s)));
            }
            if (filter.ExpiringWithinDays == true)
            {
                var cutoff = DateTime.UtcNow.Date.AddDays(14);
                query = query.Where(m => m.ExpiryDate <= cutoff && m.Status == MemberPTPackageStatus.Active);
            }
            return query;
        }

        private static MemberPTPackageDto Map(MemberPTPackage m) => new()
        {
            Id = m.Id,
            UserId = m.UserId,
            MemberName = $"{m.User.FirstName} {m.User.LastName}".Trim(),
            TrainerId = m.TrainerId,
            TrainerName = m.Trainer?.User == null ? null : $"{m.Trainer.User.FirstName} {m.Trainer.User.LastName}".Trim(),
            PackageId = m.PackageId,
            PackageName = m.Package?.PackageName,
            TotalSessions = m.TotalSessions,
            RemainingSessions = m.RemainingSessions,
            StartDate = m.StartDate,
            ExpiryDate = m.ExpiryDate,
            FrozenUntil = m.FrozenUntil,
            Status = m.Status,
            TotalAmount = m.TotalAmount,
            PaidAmount = m.PaidAmount,
            PaymentStatus = m.PaymentStatus,
            InvoiceNumber = m.InvoiceNumber,
        };

        private async Task AddHistoryAsync(int pkgId, MemberPTPackageHistoryAction action, int? sessionsDelta, int? remaining, DateTime? expiry, int? by, string? notes, CancellationToken ct)
        {
            await _db.MemberPTPackageHistories.AddAsync(new MemberPTPackageHistory
            {
                MemberPTPackageId = pkgId,
                Action = action,
                SessionsDelta = sessionsDelta,
                RemainingSessionsAfter = remaining,
                ExpiryDateAfter = expiry,
                PerformedByUserId = by,
                Notes = notes,
            }, ct);
        }

        private async Task<string> GenerateInvoiceNumberAsync(CancellationToken ct)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"PT-{year}-";
            var last = await _db.PTPackageInvoices.AsNoTracking()
                .Where(i => i.InvoiceNumber.StartsWith(prefix))
                .OrderByDescending(i => i.InvoiceNumber)
                .Select(i => i.InvoiceNumber)
                .FirstOrDefaultAsync(ct);
            var seq = 1;
            if (last != null && int.TryParse(last.AsSpan(prefix.Length), out var n))
                seq = n + 1;
            return $"{prefix}{seq:D6}";
        }
    }
}
