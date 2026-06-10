namespace GymManagement.Domain.Entities;

public class WorkoutCategoryWarmup : BaseEntity
{
    public int WorkoutCategoryId { get; set; }
    public int WarmupId { get; set; }
    public int DisplayOrder { get; set; }

    public WorkoutCategory WorkoutCategory { get; set; } = null!;
    public Warmup Warmup { get; set; } = null!;
}
