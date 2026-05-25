namespace GymManagement.Core.DTOs
{
    public class MemberProfileDto
    {
        public int Id { get; set; }
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
        public DateTime RegistrationDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class StaffProfileDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? Department { get; set; }
        public string? JobTitle { get; set; }
        public string? ShiftType { get; set; }
        public DateTime? JoiningDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class UserAggregateDto
    {
        public UserDto User { get; set; } = null!;
        public IReadOnlyList<AppRoleDto> AppRoles { get; set; } = Array.Empty<AppRoleDto>();
        public MemberProfileDto? MemberProfile { get; set; }
        public TrainerDto? TrainerProfile { get; set; }
        public StaffProfileDto? StaffProfile { get; set; }
    }

    public class AssignRoleRequest
    {
        public string RoleCode { get; set; } = string.Empty;
    }

    public class TrainerProfileSeedDto
    {
        public string? Specialization { get; set; }
        public string? Bio { get; set; }
        public DateTime? HireDate { get; set; }
    }
}
