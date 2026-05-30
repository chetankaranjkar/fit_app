namespace GymManagement.Domain.Entities.Health
{
    public class UserMedicalCondition : BaseEntity
    {
        public int UserHealthProfileId { get; set; }

        /// <summary>Diabetes, HighBloodPressure, Other, etc.</summary>
        public string ConditionCode { get; set; } = string.Empty;

        /// <summary>When <see cref="ConditionCode"/> is Other.</summary>
        public string? CustomConditionName { get; set; }

        public string? Notes { get; set; }

        public UserHealthProfile HealthProfile { get; set; } = null!;
    }
}
