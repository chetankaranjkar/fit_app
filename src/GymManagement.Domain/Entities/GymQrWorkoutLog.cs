namespace GymManagement.Domain.Entities;

/// <summary>Per-exercise log line for a <see cref="GymQrWorkoutSession"/>.</summary>
public sealed class GymQrWorkoutLog
{
    public int Id { get; set; }

    public Guid SessionId { get; set; }

    public string ExerciseName { get; set; } = string.Empty;

    public int Reps { get; set; }

    public decimal Weight { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public GymQrWorkoutSession Session { get; set; } = null!;
}
