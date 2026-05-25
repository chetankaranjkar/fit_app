using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class PtDashboardService : IPtDashboardService
    {
        private readonly ApplicationDbContext _db;

        public PtDashboardService(ApplicationDbContext db) => _db = db;

        public async Task<TrainerEarningsDashboardDto> GetTrainerDashboardAsync(int trainerId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var sessions = await _db.PTSessions.AsNoTracking()
                .Where(s => s.TrainerId == trainerId && !s.IsDeleted)
                .ToListAsync(ct);

            var completed = sessions.Count(s => s.Status == PTSessionStatus.Completed);
            var activeClients = await _db.MemberPTPackages.AsNoTracking()
                .Where(m => m.TrainerId == trainerId && !m.IsDeleted && m.Status == MemberPTPackageStatus.Active)
                .Select(m => m.UserId).Distinct().CountAsync(ct);

            var monthlyEarnings = await _db.PTCommissions.AsNoTracking()
                .Where(c => c.TrainerId == trainerId && !c.IsDeleted && c.EarnedDate >= monthStart &&
                            c.Status != TrainerCommissionStatus.Reversed)
                .SumAsync(c => c.Amount, ct);

            var pending = await _db.PTCommissions.AsNoTracking()
                .Where(c => c.TrainerId == trainerId && !c.IsDeleted && c.Status == TrainerCommissionStatus.Approved && c.PayoutId == null)
                .SumAsync(c => c.Amount, ct);

            var attended = await _db.PTAttendances.AsNoTracking()
                .Include(a => a.PTSession)
                .Where(a => !a.IsDeleted && a.PTSession.TrainerId == trainerId)
                .ToListAsync(ct);
            var attendancePct = attended.Count == 0 ? 0 :
                Math.Round(100m * attended.Count(a => a.MemberPresent && a.TrainerPresent) / attended.Count, 1);

            var topPackages = await _db.MemberPTPackages.AsNoTracking()
                .Include(m => m.Package)
                .Where(m => m.TrainerId == trainerId && !m.IsDeleted && m.PaymentStatus == PTPaymentStatus.Paid)
                .GroupBy(m => m.Package.PackageName)
                .Select(g => new PackageSalesStatDto { PackageName = g.Key, Count = g.Count(), Revenue = g.Sum(x => x.TotalAmount) })
                .OrderByDescending(x => x.Count).Take(5)
                .ToListAsync(ct);

            var sessionTrend = await MonthlyTrendAsync(trainerId, true, ct);
            var revenueTrend = await MonthlyTrendAsync(trainerId, false, ct);

            return new TrainerEarningsDashboardDto
            {
                TotalSessions = sessions.Count,
                SessionsCompleted = completed,
                ActiveClients = activeClients,
                MonthlyEarnings = monthlyEarnings,
                PendingCommissions = pending,
                AttendancePercent = attendancePct,
                TopPackagesSold = topPackages,
                MonthlySessionTrend = sessionTrend,
                MonthlyRevenueTrend = revenueTrend,
            };
        }

        public async Task<PTRevenueReportDto> GetAdminSummaryAsync(CancellationToken ct = default)
        {
            var pkgs = await _db.MemberPTPackages.AsNoTracking().Where(m => !m.IsDeleted).ToListAsync(ct);
            return new PTRevenueReportDto
            {
                TotalRevenue = pkgs.Sum(m => m.TotalAmount),
                TotalPaid = pkgs.Sum(m => m.PaidAmount),
                TotalPending = pkgs.Sum(m => m.TotalAmount - m.PaidAmount),
                PackagesSold = pkgs.Count(m => m.PaymentStatus == PTPaymentStatus.Paid),
            };
        }

        private async Task<IReadOnlyList<MonthlyStatPointDto>> MonthlyTrendAsync(int trainerId, bool sessions, CancellationToken ct)
        {
            var from = DateTime.UtcNow.AddMonths(-5);
            if (sessions)
            {
                return await _db.PTSessions.AsNoTracking()
                    .Where(s => s.TrainerId == trainerId && !s.IsDeleted && s.ScheduledStartUtc >= from && s.Status == PTSessionStatus.Completed)
                    .GroupBy(s => new { s.ScheduledStartUtc.Year, s.ScheduledStartUtc.Month })
                    .Select(g => new MonthlyStatPointDto { Year = g.Key.Year, Month = g.Key.Month, Value = g.Count() })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month)
                    .ToListAsync(ct);
            }
            return await _db.PTCommissions.AsNoTracking()
                .Where(c => c.TrainerId == trainerId && !c.IsDeleted && c.EarnedDate >= from && c.Status != TrainerCommissionStatus.Reversed)
                .GroupBy(c => new { c.EarnedDate.Year, c.EarnedDate.Month })
                .Select(g => new MonthlyStatPointDto { Year = g.Key.Year, Month = g.Key.Month, Value = g.Sum(x => x.Amount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync(ct);
        }
    }
}
