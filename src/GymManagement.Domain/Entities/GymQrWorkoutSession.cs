namespace GymManagement.Domain.Entities;

/// <summary>
/// Gym-floor workout session started or renewed by QR attendance scan (distinct from plan-based <see cref="WorkoutSession"/>).
/// Table: <c>GymQrWorkoutSessions</c> — portable to PostgreSQL as uuid/timestamptz.
/// </summary>
public sealed class GymQrWorkoutSession
{
    public Guid Id { get; set; }

    /// <summary>Member (Users.Id) who owns the session.</summary>
    public int MemberUserId { get; set; }

    /// <summary>Venue branch (gym location).</summary>
    public int BranchId { get; set; }

    public DateTime StartTimeUtc { get; set; }
    public DateTime? EndTimeUtc { get; set; }
    public DateTime LastActivityAtUtc { get; set; }

    /// <summary><c>active</c> or <c>completed</c>.</summary>
    public string Status { get; set; } = "active";

    public User? Member { get; set; }
    public Branch? Branch { get; set; }
    public ICollection<GymQrWorkoutLog> Logs { get; set; } = new List<GymQrWorkoutLog>();
}
