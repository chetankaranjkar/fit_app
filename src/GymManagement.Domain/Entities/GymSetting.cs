namespace GymManagement.Domain.Entities;

/// <summary>Singleton gym configuration (row Id = 1).</summary>
public class GymSetting
{
    public int Id { get; set; } = 1;

    public bool AllowMemberWorkoutPlanCreation { get; set; } = true;

    /// <summary>Max personal plans per member. Use -1 for unlimited.</summary>
    public int MaxPersonalWorkoutPlansPerMember { get; set; } = 1;

    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;
}
