namespace GymManagement.Domain.Entities
{
    public class WorkoutSession : BaseEntity
    {
        /// <summary>Optional so that when User has a query filter (e.g. IsDeleted), sessions can still load if the user is filtered out.</summary>
        public int? UserId { get; set; }
        /// <summary>Member business profile (<see cref="Member"/>). Used for live tracking APIs.</summary>
        public int? MemberId { get; set; }
        public int? WorkoutPlanId { get; set; }
        public DateTime SessionDate { get; set; } = DateTime.UtcNow;
        /// <summary>Calendar date of the workout (local gym day).</summary>
        public DateTime? WorkoutDate { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        /// <summary>UTC start for live tracking (maps to spec StartTime).</summary>
        public DateTime? SessionStartUtc { get; set; }
        /// <summary>UTC end for live tracking (maps to spec EndTime).</summary>
        public DateTime? SessionEndUtc { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }
        public bool IsCompleted { get; set; } = false;
        /// <summary>InProgress | Completed | Skipped. Legacy rows may be null — treat <see cref="IsCompleted"/> as Completed.</summary>
        public string? Status { get; set; }
        public decimal? CaloriesBurned { get; set; }
        public decimal? CompletionPercent { get; set; }
        public decimal? TotalVolume { get; set; }

        // Navigation properties (User optional to align with User's global query filter)
        public User? User { get; set; }
        public Member? Member { get; set; }
        public WorkoutPlan? WorkoutPlan { get; set; }
        public ICollection<WorkoutLog> WorkoutLogs { get; set; } = new List<WorkoutLog>();
        public ICollection<WorkoutSessionExercise> SessionExercises { get; set; } = new List<WorkoutSessionExercise>();
    }
}