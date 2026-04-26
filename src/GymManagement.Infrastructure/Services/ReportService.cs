using System.Text;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed class ReportService : IReportService
    {
        private readonly ApplicationDbContext _context;

        public ReportService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ReportSummaryDto> GetSummaryAsync(DateTime fromDate, DateTime toDate)
        {
            var from = fromDate.Date;
            var to = toDate.Date;
            if (to < from) (from, to) = (to, from);

            var payments = await _context.Payments
                .AsNoTracking()
                .Where(p => p.PaymentDate.Date >= from && p.PaymentDate.Date <= to)
                .ToListAsync();

            var paymentById = payments.ToDictionary(p => p.Id);
            var memberships = await _context.UserMemberships
                .AsNoTracking()
                .Include(m => m.Plan)
                .Where(m => m.StartDate.Date <= to && m.EndDate.Date >= from)
                .ToListAsync();
            var membershipById = memberships.ToDictionary(m => m.Id);

            var attendanceLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(a => a.AttendanceDate.Date >= from && a.AttendanceDate.Date <= to)
                .ToListAsync();

            var revenueTrend = payments
                .GroupBy(p => p.PaymentDate.Date)
                .Select(g => new RevenuePointDto
                {
                    Date = g.Key,
                    Amount = g.Sum(x => x.Amount),
                    PaymentsCount = g.Count()
                })
                .OrderBy(x => x.Date)
                .ToList();

            var planSales = payments
                .Where(p => membershipById.ContainsKey(p.MembershipId))
                .GroupBy(p =>
                {
                    var m = membershipById[p.MembershipId];
                    return new { m.PlanId, PlanName = m.Plan?.PlanName ?? $"Plan #{m.PlanId}" };
                })
                .Select(g => new PlanSalesPointDto
                {
                    PlanId = g.Key.PlanId,
                    PlanName = g.Key.PlanName,
                    SalesCount = g.Count(),
                    RevenueAmount = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.SalesCount)
                .ThenBy(x => x.PlanName)
                .ToList();

            var churnCount = await _context.UserMemberships
                .AsNoTracking()
                .CountAsync(m =>
                    (m.Status == MembershipStatus.Expired || m.Status == MembershipStatus.Cancelled) &&
                    m.EndDate.Date >= from && m.EndDate.Date <= to);

            var activeAtStart = await _context.UserMemberships
                .AsNoTracking()
                .CountAsync(m =>
                    m.Status == MembershipStatus.Active &&
                    m.StartDate.Date <= from &&
                    m.EndDate.Date >= from);

            var attendanceTrend = attendanceLogs
                .GroupBy(a => a.AttendanceDate.Date)
                .Select(g => new AttendancePointDto
                {
                    Date = g.Key,
                    Count = g.Count()
                })
                .OrderBy(x => x.Date)
                .ToList();

            return new ReportSummaryDto
            {
                FromDate = from,
                ToDate = to,
                TotalRevenue = payments.Sum(p => p.Amount),
                RevenueTrend = revenueTrend,
                PlanSales = planSales,
                ChurnCount = churnCount,
                ChurnRatePercent = activeAtStart > 0 ? Math.Round((decimal)churnCount * 100m / activeAtStart, 2) : null,
                AttendanceTrend = attendanceTrend
            };
        }

        public async Task<byte[]> ExportSummaryCsvAsync(DateTime fromDate, DateTime toDate)
        {
            var summary = await GetSummaryAsync(fromDate, toDate);
            var sb = new StringBuilder();
            sb.AppendLine("Section,Key,Value");
            sb.AppendLine($"Meta,FromDate,{summary.FromDate:yyyy-MM-dd}");
            sb.AppendLine($"Meta,ToDate,{summary.ToDate:yyyy-MM-dd}");
            sb.AppendLine($"Revenue,TotalRevenue,{summary.TotalRevenue:F2}");
            sb.AppendLine($"Churn,Count,{summary.ChurnCount}");
            sb.AppendLine($"Churn,RatePercent,{summary.ChurnRatePercent?.ToString("F2") ?? ""}");
            sb.AppendLine();
            sb.AppendLine("RevenueTrendDate,RevenueAmount,PaymentsCount");
            foreach (var p in summary.RevenueTrend)
                sb.AppendLine($"{p.Date:yyyy-MM-dd},{p.Amount:F2},{p.PaymentsCount}");
            sb.AppendLine();
            sb.AppendLine("PlanId,PlanName,SalesCount,RevenueAmount");
            foreach (var p in summary.PlanSales)
                sb.AppendLine($"{p.PlanId},{CsvEscape(p.PlanName)},{p.SalesCount},{p.RevenueAmount:F2}");
            sb.AppendLine();
            sb.AppendLine("AttendanceDate,AttendanceCount");
            foreach (var p in summary.AttendanceTrend)
                sb.AppendLine($"{p.Date:yyyy-MM-dd},{p.Count}");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> ExportSummaryXlsAsync(DateTime fromDate, DateTime toDate)
        {
            var csv = await ExportSummaryCsvAsync(fromDate, toDate);
            return csv;
        }

        public async Task<byte[]> ExportPaymentsCsvAsync(DateTime fromDate, DateTime toDate)
        {
            var from = fromDate.Date;
            var to = toDate.Date;
            if (to < from) (from, to) = (to, from);

            var rows = await _context.Payments
                .AsNoTracking()
                .Where(p => p.PaymentDate.Date >= from && p.PaymentDate.Date <= to)
                .Select(p => new
                {
                    p.Id,
                    p.MembershipId,
                    p.Amount,
                    p.PaymentDate,
                    p.PaymentMode,
                    p.ReceiptNo
                })
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("PaymentId,MembershipId,Amount,PaymentDate,PaymentMode,ReceiptNo");
            foreach (var r in rows)
            {
                sb.AppendLine($"{r.Id},{r.MembershipId},{r.Amount:F2},{r.PaymentDate:yyyy-MM-dd},{r.PaymentMode},{CsvEscape(r.ReceiptNo ?? string.Empty)}");
            }
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> ExportPaymentsXlsAsync(DateTime fromDate, DateTime toDate)
        {
            var csv = await ExportPaymentsCsvAsync(fromDate, toDate);
            return csv;
        }

        private static string CsvEscape(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }
    }
}

