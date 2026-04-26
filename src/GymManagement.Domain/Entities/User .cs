namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// <b>Profile</b> (person record). RBAC: <see cref="AuthUser"/> → <c>Users</c> → <see cref="UserRole"/> (role mapping)
    /// → <see cref="AppRole"/> → <see cref="RolePermission"/> → <see cref="Permission"/>.
    /// </summary>
    public class User : BaseEntity
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty; // Male, Female, Other
        public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
        public string? Address { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? PreferredGymTime { get; set; } // Morning, Afternoon, Evening, Night
        public bool IsActive { get; set; } = true;
        public string? QrCode { get; set; }
        public string? MembershipStatus { get; set; }
        public int? OrganizationId { get; set; }

        // Navigation properties
        public Organization? Organization { get; set; }
        public ICollection<UserDetail> UserDetails { get; set; } = new List<UserDetail>();
        public ICollection<UserSchedule> Schedules { get; set; } = new List<UserSchedule>();
        public ICollection<UserInstructor> InstructorAssignments { get; set; } = new List<UserInstructor>();
        public ICollection<TrainerFeedback> Feedbacks { get; set; } = new List<TrainerFeedback>();
        public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
        public ICollection<UserBodyImage> BodyImages { get; set; } = new List<UserBodyImage>();
        public ICollection<UserMembership> UserMemberships { get; set; } = new List<UserMembership>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<UserDietPlan> UserDietPlans { get; set; } = new List<UserDietPlan>();
        public ICollection<PersonalRecord> PersonalRecords { get; set; } = new List<PersonalRecord>();
        public ICollection<UserGoal> UserGoals { get; set; } = new List<UserGoal>();
        public ICollection<Message> MessagesSent { get; set; } = new List<Message>();
        public ICollection<Message> MessagesReceived { get; set; } = new List<Message>();
        public ICollection<UserSupplement> UserSupplements { get; set; } = new List<UserSupplement>();
        public ICollection<UserMedicalLog> UserMedicalLogs { get; set; } = new List<UserMedicalLog>();
        public ICollection<UserAchievement> UserAchievements { get; set; } = new List<UserAchievement>();
        /// <summary>User types (e.g. Admin, Instructor, Staff) - a user can have many.</summary>
        public ICollection<UserUserType> UserUserTypes { get; set; } = new List<UserUserType>();
        /// <summary>Application roles from Roles table (many-to-many).</summary>
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        /// <summary>Optional trainer profile when this user is also a trainer.</summary>
        public Trainer? Trainer { get; set; }
        /// <summary>Login (AuthUsers) when this user has an account.</summary>
        public AuthUser? AuthUser { get; set; }
        public ICollection<LoginActivity> LoginActivities { get; set; } = new List<LoginActivity>();
    }
}