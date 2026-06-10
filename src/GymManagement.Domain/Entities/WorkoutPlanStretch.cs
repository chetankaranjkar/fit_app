namespace GymManagement.Domain.Entities;

public class WorkoutPlanStretch : BaseEntity
{
    public int WorkoutPlanId { get; set; }
    public int StretchId { get; set; }
    public int DisplayOrder { get; set; }

    public WorkoutPlan WorkoutPlan { get; set; } = null!;
    public Stretch Stretch { get; set; } = null!;
}
