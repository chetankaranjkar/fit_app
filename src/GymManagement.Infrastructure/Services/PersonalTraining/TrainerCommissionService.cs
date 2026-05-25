using GymManagement.Core.DTOs.Common;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class TrainerCommissionService : ITrainerCommissionService
    {
        private readonly ApplicationDbContext _db;

        public TrainerCommissionService(ApplicationDbContext db) => _db = db;

        public async Task<IReadOnlyList<TrainerCommissionRuleDto>> GetRulesAsync(int trainerId, CancellationToken ct = default)
        {
            var list = await _db.PTCommissionRules.AsNoTracking()
                .Where(r => r.TrainerId == trainerId && !r.IsDeleted)
                .ToListAsync(ct);
            return list.Select(r => new TrainerCommissionRuleDto
            {
                Id = r.Id,
                TrainerId = r.TrainerId,
                CommissionType = r.CommissionType,
                Percentage = r.Percentage,
                FixedAmount = r.FixedAmount,
                PackageId = r.PackageId,
                IsActive = r.IsActive,
            }).ToList();
        }

        public async Task<TrainerCommissionRuleDto> UpsertRuleAsync(UpsertCommissionRuleDto dto, CancellationToken ct = default)
        {
            var existing = await _db.PTCommissionRules
                .FirstOrDefaultAsync(r => r.TrainerId == dto.TrainerId && r.PackageId == dto.PackageId && !r.IsDeleted, ct);

            if (existing != null)
            {
                existing.CommissionType = dto.CommissionType;
                existing.Percentage = dto.Percentage;
                existing.FixedAmount = dto.FixedAmount;
                existing.IsActive = dto.IsActive;
                existing.UpdatedDate = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                return MapRule(existing);
            }

            var rule = new TrainerCommissionRule
            {
                TrainerId = dto.TrainerId,
                CommissionType = dto.CommissionType,
                Percentage = dto.Percentage,
                FixedAmount = dto.FixedAmount,
                PackageId = dto.PackageId,
                IsActive = dto.IsActive,
            };
            await _db.PTCommissionRules.AddAsync(rule, ct);
            await _db.SaveChangesAsync(ct);
            return MapRule(rule);
        }

        public async Task<PagedResultDto<TrainerCommissionDto>> SearchCommissionsAsync(int? trainerId, int page, int pageSize, CancellationToken ct = default)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var query = _db.PTCommissions.AsNoTracking().Where(c => !c.IsDeleted);
            if (trainerId.HasValue) query = query.Where(c => c.TrainerId == trainerId);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(c => c.EarnedDate)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
            return new PagedResultDto<TrainerCommissionDto>
            {
                Items = items.Select(c => new TrainerCommissionDto
                {
                    Id = c.Id,
                    TrainerId = c.TrainerId,
                    Amount = c.Amount,
                    Status = c.Status,
                    EarnedDate = c.EarnedDate,
                    PTSessionId = c.PTSessionId,
                }).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<int> CreateMonthlyPayoutAsync(int trainerId, int year, int month, CancellationToken ct = default)
        {
            var existing = await _db.PTPayouts.FirstOrDefaultAsync(p =>
                p.TrainerId == trainerId && p.Year == year && p.Month == month && !p.IsDeleted, ct);
            if (existing != null) return existing.Id;

            var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(1);
            var pending = await _db.PTCommissions
                .Where(c => c.TrainerId == trainerId && !c.IsDeleted &&
                            c.Status == TrainerCommissionStatus.Approved &&
                            c.EarnedDate >= start && c.EarnedDate < end && c.PayoutId == null)
                .ToListAsync(ct);

            var total = pending.Sum(c => c.Amount);
            var payout = new TrainerPayout
            {
                TrainerId = trainerId,
                Year = year,
                Month = month,
                TotalAmount = total,
                Status = TrainerPayoutStatus.Pending,
            };
            await _db.PTPayouts.AddAsync(payout, ct);
            await _db.SaveChangesAsync(ct);
            foreach (var c in pending)
            {
                c.PayoutId = payout.Id;
                c.Status = TrainerCommissionStatus.Paid;
                c.PaidDate = DateTime.UtcNow;
                c.UpdatedDate = DateTime.UtcNow;
            }
            payout.Status = TrainerPayoutStatus.Paid;
            payout.PaidDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return payout.Id;
        }

        public async Task AccruePackageCommissionAsync(MemberPTPackage memberPackage, CancellationToken ct = default)
        {
            if (memberPackage.PaymentStatus != PTPaymentStatus.Paid) return;
            var rule = await ResolveRuleAsync(memberPackage.TrainerId, memberPackage.PackageId, ct);
            if (rule == null) return;
            var amount = CalculateAmount(rule, memberPackage.PaidAmount, null);
            await AddCommissionAsync(memberPackage.TrainerId, amount, rule.CommissionType, null, memberPackage.Id, memberPackage.PaidAmount, ct);
        }

        public async Task AccrueSessionCommissionAsync(PTSession session, decimal sessionValue, CancellationToken ct = default)
        {
            var pkg = await _db.MemberPTPackages.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == session.MemberPTPackageId, ct);
            if (pkg == null || pkg.PaymentStatus != PTPaymentStatus.Paid) return;
            var rule = await ResolveRuleAsync(session.TrainerId, pkg.PackageId, ct);
            if (rule == null) return;
            var amount = CalculateAmount(rule, sessionValue, rule.FixedAmount);
            await AddCommissionAsync(session.TrainerId, amount, rule.CommissionType, session.Id, null, sessionValue, ct);
        }

        public async Task ReverseCommissionForSessionAsync(int sessionId, CancellationToken ct = default)
        {
            var commissions = await _db.PTCommissions
                .Where(c => c.PTSessionId == sessionId && !c.IsDeleted && c.Status != TrainerCommissionStatus.Reversed)
                .ToListAsync(ct);
            foreach (var c in commissions)
            {
                c.Status = TrainerCommissionStatus.Reversed;
                c.UpdatedDate = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync(ct);
        }

        private async Task<TrainerCommissionRule?> ResolveRuleAsync(int trainerId, int packageId, CancellationToken ct)
        {
            return await _db.PTCommissionRules.AsNoTracking()
                .Where(r => r.TrainerId == trainerId && r.IsActive && !r.IsDeleted &&
                            (r.PackageId == null || r.PackageId == packageId))
                .OrderByDescending(r => r.PackageId.HasValue)
                .FirstOrDefaultAsync(ct);
        }

        private static decimal CalculateAmount(TrainerCommissionRule rule, decimal baseAmount, decimal? fixedOverride)
        {
            return rule.CommissionType switch
            {
                TrainerCommissionType.Percentage when rule.Percentage.HasValue =>
                    Math.Round(baseAmount * rule.Percentage.Value / 100m, 2),
                TrainerCommissionType.FixedPerSession =>
                    fixedOverride ?? rule.FixedAmount ?? 0,
                TrainerCommissionType.PackageBased when rule.Percentage.HasValue =>
                    Math.Round(baseAmount * rule.Percentage.Value / 100m, 2),
                _ => rule.FixedAmount ?? 0,
            };
        }

        private async Task AddCommissionAsync(int trainerId, decimal amount, TrainerCommissionType type, int? sessionId = null, int? memberPackageId = null, decimal? baseAmount = null, CancellationToken ct = default)
        {
            if (amount <= 0) return;
            await _db.PTCommissions.AddAsync(new TrainerCommission
            {
                TrainerId = trainerId,
                PTSessionId = sessionId,
                MemberPTPackageId = memberPackageId,
                Amount = amount,
                CommissionType = type,
                Status = TrainerCommissionStatus.Approved,
                BaseAmount = baseAmount,
            }, ct);
            await _db.SaveChangesAsync(ct);
        }

        private static TrainerCommissionRuleDto MapRule(TrainerCommissionRule r) => new()
        {
            Id = r.Id,
            TrainerId = r.TrainerId,
            CommissionType = r.CommissionType,
            Percentage = r.Percentage,
            FixedAmount = r.FixedAmount,
            PackageId = r.PackageId,
            IsActive = r.IsActive,
        };
    }
}
