namespace GymManagement.Core.DTOs
{
    /// <summary>Member profile from <c>Users</c> plus login email from <c>AuthUsers</c>.</summary>
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public bool IsActive { get; set; }
        public int? OrganizationId { get; set; }
    }
}
