namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Audit trail for auth user sign-in attempts (success or failure).
    /// </summary>
    public class LoginActivity : BaseEntity
    {
        /// <summary>Optional when logging failed attempts with no matching <see cref="AuthUser"/> (e.g. unknown email).</summary>
        public int? AuthUserId { get; set; }
        public int? UserId { get; set; }
        public DateTime LoginTime { get; set; } = DateTime.UtcNow;
        public DateTime? LogoutTime { get; set; }
        public string? IPAddress { get; set; }
        public string? DeviceInfo { get; set; }
        /// <summary><c>SUCCESS</c> or <c>FAILED</c>.</summary>
        public string? Status { get; set; }
        public string? FailureReason { get; set; }
        /// <summary>Correlates with JWT jti when login succeeds.</summary>
        public string? SessionId { get; set; }

        public AuthUser? AuthUser { get; set; }
        public User? User { get; set; }
    }
}
