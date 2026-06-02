namespace GymManagement.Core.DTOs
{
    /// <summary>Single-round-trip dashboard KPIs (aggregated in SQL).</summary>
    public class DashboardSummaryDto
    {
        public int TotalMembers { get; set; }
        public int ActiveMembers { get; set; }
        public int ExpiredMemberships { get; set; }
        public int TodayAttendance { get; set; }
        public int PendingPayments { get; set; }
        public decimal MonthlyRevenue { get; set; }
        public decimal TodayRevenue { get; set; }
        public int TrainerCount { get; set; }
        public int NewMembersToday { get; set; }
        public int ExpiringMembershipsNext14Days { get; set; }
    }
}
