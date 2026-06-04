using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs;

// WorkoutType lives in GymManagement.Domain.Entities

public class WorkoutPlanAuditLogDto
{
    public int Id { get; set; }
    public int? WorkoutPlanId { get; set; }
    public string WorkoutPlanName { get; set; } = string.Empty;
    public int? AssignedToUserId { get; set; }
    public string? AssignedToUserName { get; set; }
    public WorkoutPlanAuditAction Action { get; set; }
    public string? ChangeDetails { get; set; }
    public string? SnapshotJson { get; set; }
    public int PerformedByUserId { get; set; }
    public string PerformedByUserName { get; set; } = string.Empty;
    public DateTime PerformedDate { get; set; }
}

public class WorkoutPlanAuditListQuery
{
    public int? MemberUserId { get; set; }
    public DateTime? FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
    public WorkoutPlanAuditAction? Action { get; set; }
    public int Take { get; set; } = 200;
}

public class GymSettingsDto
{
    public bool AllowMemberWorkoutPlanCreation { get; set; } = true;
    public int MaxPersonalWorkoutPlansPerMember { get; set; } = 1;
}

public class CreatePersonalWorkoutPlanDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public WorkoutType WorkoutType { get; set; }
    public int Duration { get; set; } = 45;
    public string DifficultyLevel { get; set; } = "Beginner";
    public string? Goal { get; set; }
    public int DurationDays { get; set; } = 30;
    public int WorkoutsPerWeek { get; set; } = 3;
}
