using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class UserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public string? Address { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? PreferredGymTime { get; set; }
        public bool IsActive { get; set; }
        /// <summary>Login role when the user has an account: User (Member), Instructor, or Admin.</summary>
        public Role? Role { get; set; }
        /// <summary>Login email when the user has an account (same as <see cref="Email"/> when linked to <c>AuthUsers</c>).</summary>
        public string? Username { get; set; }
        /// <summary>User types (e.g. Admin, Instructor, Staff) - a user can have many.</summary>
        public List<UserTypeDto> UserTypes { get; set; } = new();
    }

    public class CreateUserDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? PreferredGymTime { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Username { get; set; }
        public string? Password { get; set; }
        /// <summary>Role for the login account when Email/Password are provided: User (Member), Instructor, or Admin. Defaults to User.</summary>
        public Role? Role { get; set; }
        /// <summary>Optional. If set, a membership will be created for the user.</summary>
        public int? PlanId { get; set; }
        /// <summary>Optional. Start date for membership (defaults to today if PlanId is set).</summary>
        public DateTime? MembershipStartDate { get; set; }
        /// <summary>Optional. Trainer to assign to the user.</summary>
        public int? TrainerId { get; set; }
        /// <summary>When Role is Instructor: trainer specialization (e.g. Yoga, Strength).</summary>
        public string? InstructorSpecialization { get; set; }
        /// <summary>When Role is Instructor: short bio.</summary>
        public string? InstructorBio { get; set; }
        /// <summary>When Role is Instructor: hire date (defaults to today if not set).</summary>
        public DateTime? InstructorHireDate { get; set; }
        /// <summary>User type IDs (e.g. Admin, Instructor, Staff). A user can have many.</summary>
        public List<int> UserTypeIds { get; set; } = new();
    }

    public class UpdateUserDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? PreferredGymTime { get; set; }
        public bool? IsActive { get; set; }
        /// <summary>Optional. If set, a new membership will be added for the user.</summary>
        public int? PlanId { get; set; }
        /// <summary>Optional. Start date for new membership (defaults to today if PlanId is set).</summary>
        public DateTime? MembershipStartDate { get; set; }
        /// <summary>Optional. Trainer to assign to the user.</summary>
        public int? TrainerId { get; set; }
        /// <summary>User type IDs to assign. Replaces existing types.</summary>
        public List<int>? UserTypeIds { get; set; }
    }
}

