namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Trainer profile linked to a User. Personal/identity data (name, email, phone, login) lives on User;
    /// Login email is on <see cref="AuthUser"/> linked via <see cref="UserId"/>. This table holds only trainer-specific fields.
    /// </summary>
    public class Trainer : BaseEntity
    {
        public int UserId { get; set; }
        public int? OrganizationId { get; set; }

        /// <summary>Unique employee code (e.g. EMP001). Required for new trainers.</summary>
        public string? EmployeeCode { get; set; }
        public string? Specialization { get; set; }
        public string? CertificationDetails { get; set; }
        public int? ExperienceYears { get; set; }
        public decimal? Salary { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public DateTime HireDate { get; set; } = DateTime.UtcNow;
        public DateTime? JoiningDate { get; set; }
        public string? Bio { get; set; }
        public string? ProfilePicture { get; set; }
        public decimal? Rating { get; set; }
        public int TotalClients { get; set; } = 0;
        public int? MaxActiveClients { get; set; }
        public string? AvailabilityStatus { get; set; } // Available, Busy, On Leave
        public bool IsPersonalTrainer { get; set; } = true;
        public DateTime? TerminationDate { get; set; }
        public string? TerminationReason { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation
        public User User { get; set; } = null!;
        public Organization? Organization { get; set; }
        public ICollection<WorkoutPlan> WorkoutPlans { get; set; } = new List<WorkoutPlan>();
        public ICollection<UserSchedule> Schedules { get; set; } = new List<UserSchedule>();
        public ICollection<UserInstructor> UserAssignments { get; set; } = new List<UserInstructor>();
        public ICollection<TrainerFeedback> Feedbacks { get; set; } = new List<TrainerFeedback>();
        public ICollection<TrainerSpecialization> Specializations { get; set; } = new List<TrainerSpecialization>();
        public ICollection<TrainerCertification> Certifications { get; set; } = new List<TrainerCertification>();
        public ICollection<UserDietPlan> AssignedUserDietPlans { get; set; } = new List<UserDietPlan>();
    }
}
