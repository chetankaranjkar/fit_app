namespace GymManagement.Domain.Entities;

/// <summary>Live workout session status (stored on <see cref="WorkoutSession.Status"/>).</summary>
public static class WorkoutSessionStatus
{
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";
    public const string Skipped = "Skipped";
}
