namespace GymManagement.Domain.Entities.Health
{
    public class UserMedication : BaseEntity
    {
        public int UserHealthProfileId { get; set; }
        public string MedicationName { get; set; } = string.Empty;
        public string? Dosage { get; set; }
        public string? Reason { get; set; }

        public UserHealthProfile HealthProfile { get; set; } = null!;
    }
}
