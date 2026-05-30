namespace GymManagement.Domain.Entities;

/// <summary>
/// Per-set performed data for a live workout session. Plan templates stay on <see cref="WorkoutPlanExercise"/>.
/// </summary>
public class WorkoutSessionExercise
{
    public long Id { get; set; }
    public int WorkoutSessionId { get; set; }
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;
    public int SetNumber { get; set; }
    public int TargetReps { get; set; }
    public int? ActualReps { get; set; }
    public decimal? TargetWeight { get; set; }
    public decimal? ActualWeight { get; set; }
    public int? DurationSeconds { get; set; }
    public int? RestSeconds { get; set; }
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int? CompletedByUserId { get; set; }

    public WorkoutSession WorkoutSession { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
