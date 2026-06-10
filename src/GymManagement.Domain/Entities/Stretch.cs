namespace GymManagement.Domain.Entities;

public class Stretch : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<WorkoutPlanStretch> WorkoutPlanStretches { get; set; } = new List<WorkoutPlanStretch>();
}
