namespace GymManagement.Domain.Entities
{
    public class WorkoutSession : BaseEntity
    {
        /// <summary>Optional so that when User has a query filter (e.g. IsDeleted), sessions can still load if the user is filtered out.</summary>
        public int? UserId { get; set; }
        public int WorkoutPlanId { get; set; }
        public DateTime SessionDate { get; set; } = DateTime.UtcNow;
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }
        public bool IsCompleted { get; set; } = false;

        // Navigation properties (User optional to align with User's global query filter)
        public User? User { get; set; }
        public WorkoutPlan WorkoutPlan { get; set; } = null!;
        public ICollection<WorkoutLog> WorkoutLogs { get; set; } = new List<WorkoutLog>();
    }
}