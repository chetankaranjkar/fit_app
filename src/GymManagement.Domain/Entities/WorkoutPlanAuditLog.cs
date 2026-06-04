using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities;

/// <summary>Immutable audit trail for personal workout plans. Never auto-deleted.</summary>
public class WorkoutPlanAuditLog : BaseEntity
{
    public int? WorkoutPlanId { get; set; }

    [MaxLength(200)]
    public string WorkoutPlanName { get; set; } = string.Empty;

    public int? AssignedToUserId { get; set; }

    public WorkoutPlanAuditAction Action { get; set; }

    /// <summary>Full snapshot JSON for deletes; optional delta summary for other actions.</summary>
    public string? SnapshotJson { get; set; }

    [MaxLength(4000)]
    public string? ChangeDetails { get; set; }

    public int PerformedByUserId { get; set; }

    [MaxLength(200)]
    public string PerformedByUserName { get; set; } = string.Empty;

    public DateTime PerformedDate { get; set; } = DateTime.UtcNow;

    [MaxLength(64)]
    public string? IPAddress { get; set; }

    [MaxLength(512)]
    public string? DeviceInfo { get; set; }
}
