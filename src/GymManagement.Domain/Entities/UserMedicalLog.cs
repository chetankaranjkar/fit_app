namespace GymManagement.Domain.Entities
{
    public class UserMedicalLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? ConditionName { get; set; }
        public string? Severity { get; set; }
        public string? Notes { get; set; }
        public DateTime ReportedDate { get; set; }

        public User User { get; set; } = null!;
    }
}
