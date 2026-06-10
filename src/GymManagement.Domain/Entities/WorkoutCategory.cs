namespace GymManagement.Domain.Entities;

public class WorkoutCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<WorkoutCategoryWarmup> CategoryWarmups { get; set; } = new List<WorkoutCategoryWarmup>();
    public ICollection<WorkoutCategoryStretch> CategoryStretches { get; set; } = new List<WorkoutCategoryStretch>();
    public ICollection<WorkoutPlan> WorkoutPlans { get; set; } = new List<WorkoutPlan>();
}
