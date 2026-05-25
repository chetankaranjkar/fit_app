namespace GymManagement.Core.Authorization
{
    /// <summary>Canonical <c>Roles.Name</c> values for RBAC and profile provisioning.</summary>
    public static class ApplicationRoleCodes
    {
        public const string Admin = "ADMIN";
        public const string Member = "MEMBER";
        public const string Trainer = "TRAINER";
        public const string Staff = "STAFF";
        public const string Receptionist = "RECEPTIONIST";
        public const string Accountant = "ACCOUNTANT";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Admin, Member, Trainer, Staff, Receptionist, Accountant
        };

        public static readonly IReadOnlySet<string> StaffLikeRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Staff, Receptionist, Accountant
        };
    }
}
