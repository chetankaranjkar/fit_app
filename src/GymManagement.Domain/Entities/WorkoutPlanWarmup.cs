namespace GymManagement.Domain.Entities;

public class WorkoutPlanWarmup : BaseEntity
{
    public int WorkoutPlanId { get; set; }
    public int? WorkoutPlanDayId { get; set; }
    public int WarmupId { get; set; }
    public int DisplayOrder { get; set; }

    public WorkoutPlan WorkoutPlan { get; set; } = null!;
    public WorkoutPlanDay? WorkoutPlanDay { get; set; }
    public Warmup Warmup { get; set; } = null!;
}
