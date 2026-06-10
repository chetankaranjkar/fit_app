namespace GymManagement.Domain.Entities;

public class WorkoutPlanVersion : BaseEntity
{
    public int WorkoutPlanId { get; set; }
    public int VersionNumber { get; set; }
    public string SnapshotJson { get; set; } = "{}";
    public string? ChangeSummary { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }

    public WorkoutPlan WorkoutPlan { get; set; } = null!;
}
