namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Login credentials. Links to profile via <see cref="UserId"/> (member and trainer accounts use the same user row; trainer profile is <see cref="User.Trainer"/>).
    /// RBAC: <c>Users</c> → <see cref="UserRole"/> → <see cref="AppRole"/>.
    /// Inherits <see cref="BaseEntity"/> for repository soft-delete and audit columns.
    /// </summary>
    public class AuthUser : BaseEntity
    {
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;

        public int? UserId { get; set; }
        public User? User { get; set; }

        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public string? PreviousRefreshTokenHash { get; set; }
        public DateTime? RefreshTokenCompromisedAt { get; set; }

        public int FailedLoginAttempts { get; set; }
        public DateTime? LockoutEnd { get; set; }

        public ICollection<LoginActivity> LoginActivities { get; set; } = new List<LoginActivity>();
    }
}
