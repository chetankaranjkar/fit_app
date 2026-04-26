namespace GymManagement.Core.DTOs
{
    public class ReportSummaryDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public List<RevenuePointDto> RevenueTrend { get; set; } = new();
        public List<PlanSalesPointDto> PlanSales { get; set; } = new();
        public int ChurnCount { get; set; }
        public decimal? ChurnRatePercent { get; set; }
        public List<AttendancePointDto> AttendanceTrend { get; set; } = new();
    }

    public class RevenuePointDto
    {
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public int PaymentsCount { get; set; }
    }

    public class PlanSalesPointDto
    {
        public int PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public int SalesCount { get; set; }
        public decimal RevenueAmount { get; set; }
    }

    public class AttendancePointDto
    {
        public DateTime Date { get; set; }
        public int Count { get; set; }
    }
}

