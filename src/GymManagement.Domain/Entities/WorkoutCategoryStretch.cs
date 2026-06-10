namespace GymManagement.Domain.Entities;

public class WorkoutCategoryStretch : BaseEntity
{
    public int WorkoutCategoryId { get; set; }
    public int StretchId { get; set; }
    public int DisplayOrder { get; set; }

    public WorkoutCategory WorkoutCategory { get; set; } = null!;
    public Stretch Stretch { get; set; } = null!;
}
