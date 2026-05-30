namespace GymManagement.Domain.Entities.Health
{
    /// <summary>Member health assessment header (1:1 with <see cref="User"/>).</summary>
    public class UserHealthProfile : BaseEntity
    {
        public int UserId { get; set; }

        /// <summary>Free-text health overview / goals for trainers.</summary>
        public string? HealthOverview { get; set; }

        // PAR-Q screening
        public bool? ParqChestPainDuringExercise { get; set; }
        public bool? ParqDoctorAdvisedAgainstExercise { get; set; }
        public bool? ParqShortnessOfBreath { get; set; }
        public bool? ParqDizzinessOrFainting { get; set; }
        public bool? ParqRecentSurgery { get; set; }

        // Lifestyle
        public string? SmokingStatus { get; set; }
        public string? AlcoholFrequency { get; set; }
        public string? StressLevel { get; set; }
        public decimal? SleepHours { get; set; }

        // Doctor (optional)
        public string? DoctorName { get; set; }
        public string? DoctorClinic { get; set; }
        public string? DoctorContactNumber { get; set; }

        /// <summary>Low | Moderate | High — computed on save.</summary>
        public string RiskLevel { get; set; } = "Low";

        /// <summary>JSON array or newline-separated restrictions for trainers.</summary>
        public string? ExerciseRestrictions { get; set; }

        public bool IsCompleted { get; set; }
        public DateTime? LastAssessedAt { get; set; }

        public User User { get; set; } = null!;
        public ICollection<UserMedicalCondition> MedicalConditions { get; set; } = new List<UserMedicalCondition>();
        public ICollection<UserMedication> Medications { get; set; } = new List<UserMedication>();
        public ICollection<UserInjury> Injuries { get; set; } = new List<UserInjury>();
        public ICollection<UserEmergencyContact> EmergencyContacts { get; set; } = new List<UserEmergencyContact>();
    }
}
