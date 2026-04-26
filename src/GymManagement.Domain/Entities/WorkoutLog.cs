namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Log of a single set performed in a workout session (exercise, set number, reps, weight, notes).
    /// </summary>
    public class WorkoutLog
    {
        public int Id { get; set; }
        public int WorkoutSessionId { get; set; }
        public int ExerciseId { get; set; }
        public int SetNumber { get; set; }
        public int RepsDone { get; set; }
        public decimal? WeightUsed { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public WorkoutSession WorkoutSession { get; set; } = null!;
        public Exercise Exercise { get; set; } = null!;
    }
}
