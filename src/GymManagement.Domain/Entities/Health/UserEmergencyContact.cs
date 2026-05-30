namespace GymManagement.Domain.Entities.Health
{
    public class UserEmergencyContact : BaseEntity
    {
        public int UserHealthProfileId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Relationship { get; set; }
        public string Mobile { get; set; } = string.Empty;

        public UserHealthProfile HealthProfile { get; set; } = null!;
    }
}
