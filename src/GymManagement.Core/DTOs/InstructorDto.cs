namespace GymManagement.Core.DTOs
{
    /// <summary>
    /// Operational + performance metrics for the admin Trainers tab.
    /// </summary>
    public class TrainerStatsDto
    {
        public int TotalTrainers { get; set; }
        public int ActiveTrainers { get; set; }
        public int OnLeave { get; set; }
        public decimal? AvgRating { get; set; }
        public int TotalClientsAssigned { get; set; }
    }

    /// <summary>
    /// Trainer with display fields from linked User (FirstName, LastName, Email, Phone).
    /// </summary>
    public class TrainerDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? EmployeeCode { get; set; }
        public string? Specialization { get; set; }
        public string? CertificationDetails { get; set; }
        public int? ExperienceYears { get; set; }
        public decimal? Salary { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public DateTime HireDate { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string? Bio { get; set; }
        public string? ProfilePicture { get; set; }
        public decimal? Rating { get; set; }
        public int TotalClients { get; set; }
        public int? MaxClients { get; set; }
        public string? AvailabilityStatus { get; set; }
        public bool IsPersonalTrainer { get; set; }
        public DateTime? TerminationDate { get; set; }
        public string? TerminationReason { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Create trainer by linking an existing User. Only trainer-specific fields.
    /// </summary>
    public class CreateTrainerDto
    {
        public int UserId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? Specialization { get; set; }
        public string? CertificationDetails { get; set; }
        public int? ExperienceYears { get; set; }
        public decimal? Salary { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string? Bio { get; set; }
        public string? ProfilePicture { get; set; }
        public decimal? Rating { get; set; }
        public string? AvailabilityStatus { get; set; }
        public bool IsPersonalTrainer { get; set; } = true;
        public int? MaxClients { get; set; }
    }

    public class TrainerAssignedClientDto
    {
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? ProfilePicture { get; set; }
        public DateTime? AssignedOn { get; set; }
        public string? MembershipPlan { get; set; }
    }

    public class AssignTrainerClientRequest
    {
        public int UserId { get; set; }
    }

    public class UpdateTrainerDto
    {
        public string? EmployeeCode { get; set; }
        public string? Specialization { get; set; }
        public string? CertificationDetails { get; set; }
        public int? ExperienceYears { get; set; }
        public decimal? Salary { get; set; }
        public decimal? CommissionPercentage { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string? Bio { get; set; }
        public string? ProfilePicture { get; set; }
        public decimal? Rating { get; set; }
        public int? TotalClients { get; set; }
        public int? MaxClients { get; set; }
        public string? AvailabilityStatus { get; set; }
        public bool? IsPersonalTrainer { get; set; }
        public DateTime? TerminationDate { get; set; }
        public string? TerminationReason { get; set; }
        public bool? IsActive { get; set; }
    }
}

