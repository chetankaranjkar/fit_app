namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Gym member business profile (1:1 with <see cref="User"/>). Identity fields stay on <see cref="User"/>.
    /// </summary>
    public class Member : BaseEntity
    {
        public int UserId { get; set; }
        public string? FitnessGoal { get; set; }
        public decimal? HeightCm { get; set; }
        public decimal? WeightKg { get; set; }
        public string? MedicalConditions { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public string? PreferredGymTime { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;

        public User User { get; set; } = null!;
    }
}
