using System.Text;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class PtReportService : IPtReportService
    {
        private readonly ApplicationDbContext _db;

        public PtReportService(ApplicationDbContext db) => _db = db;

        public async Task<PTRevenueReportDto> GetRevenueReportAsync(PTReportFilterDto filter, CancellationToken ct = default)
        {
            var query = _db.MemberPTPackages.AsNoTracking().Where(m => !m.IsDeleted);
            if (filter.From.HasValue) query = query.Where(m => m.StartDate >= filter.From);
            if (filter.To.HasValue) query = query.Where(m => m.StartDate <= filter.To);
            if (filter.TrainerId.HasValue) query = query.Where(m => m.TrainerId == filter.TrainerId);
            if (filter.PackageId.HasValue) query = query.Where(m => m.PackageId == filter.PackageId);
            var list = await query.ToListAsync(ct);
            return new PTRevenueReportDto
            {
                TotalRevenue = list.Sum(m => m.TotalAmount),
                TotalPaid = list.Sum(m => m.PaidAmount),
                TotalPending = list.Sum(m => m.TotalAmount - m.PaidAmount),
                PackagesSold = list.Count(m => m.PaymentStatus == PTPaymentStatus.Paid),
            };
        }

        public async Task<PTUtilizationReportDto> GetUtilizationReportAsync(PTReportFilterDto filter, CancellationToken ct = default)
        {
            var query = _db.PTSessions.AsNoTracking().Where(s => !s.IsDeleted);
            if (filter.From.HasValue) query = query.Where(s => s.ScheduledStartUtc >= filter.From);
            if (filter.To.HasValue) query = query.Where(s => s.ScheduledStartUtc <= filter.To);
            if (filter.TrainerId.HasValue) query = query.Where(s => s.TrainerId == filter.TrainerId);
            var list = await query.ToListAsync(ct);
            var booked = list.Count;
            var completed = list.Count(s => s.Status == PTSessionStatus.Completed);
            var noShow = list.Count(s => s.Status == PTSessionStatus.NoShow);
            return new PTUtilizationReportDto
            {
                TotalSessionsBooked = booked,
                SessionsCompleted = completed,
                SessionsNoShow = noShow,
                UtilizationPercent = booked == 0 ? 0 : Math.Round(100m * completed / booked, 1),
            };
        }

        public async Task<IReadOnlyList<MemberPTPackageDto>> GetExpiredPackagesAsync(PTReportFilterDto filter, CancellationToken ct = default)
        {
            var query = _db.MemberPTPackages.AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Trainer).ThenInclude(t => t.User)
                .Include(m => m.Package)
                .Where(m => !m.IsDeleted && m.ExpiryDate < DateTime.UtcNow.Date);

            if (filter.TrainerId.HasValue) query = query.Where(m => m.TrainerId == filter.TrainerId);
            var list = await query.OrderByDescending(m => m.ExpiryDate).Take(500).ToListAsync(ct);
            return list.Select(m => new MemberPTPackageDto
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
                Status = m.Status,
                TotalAmount = m.TotalAmount,
                PaidAmount = m.PaidAmount,
                PaymentStatus = m.PaymentStatus,
                InvoiceNumber = m.InvoiceNumber,
            }).ToList();
        }

        public async Task<byte[]> ExportRevenueCsvAsync(PTReportFilterDto filter, CancellationToken ct = default)
        {
            var report = await GetRevenueReportAsync(filter, ct);
            var sb = new StringBuilder();
            sb.AppendLine("Metric,Value");
            sb.AppendLine($"TotalRevenue,{report.TotalRevenue}");
            sb.AppendLine($"TotalPaid,{report.TotalPaid}");
            sb.AppendLine($"TotalPending,{report.TotalPending}");
            sb.AppendLine($"PackagesSold,{report.PackagesSold}");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

    }
}
