namespace GymManagement.Domain.Entities
{
    public class MemberActivitySummary
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public int? TotalWorkouts { get; set; }
        public int? TotalAttendanceDays { get; set; }
        public DateTime? LastVisitDate { get; set; }
        public decimal? ComplianceScore { get; set; }

        public User? User { get; set; }
    }
}
