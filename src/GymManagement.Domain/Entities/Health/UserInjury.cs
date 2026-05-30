namespace GymManagement.Domain.Entities.Health
{
    public class UserInjury : BaseEntity
    {
        public int UserHealthProfileId { get; set; }
        public string BodyPart { get; set; } = string.Empty;
        public string InjuryType { get; set; } = string.Empty;

        /// <summary>Active | Recovering | Resolved</summary>
        public string Status { get; set; } = "Active";

        public string? Notes { get; set; }

        public UserHealthProfile HealthProfile { get; set; } = null!;
    }
}
