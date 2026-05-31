namespace GymManagement.Domain.Entities;

/// <summary>Active JWT + refresh session bound to a user device.</summary>
public class UserSession : BaseEntity
{
    /// <summary>Matches JWT <c>jti</c> claim.</summary>
    public string SessionId { get; set; } = string.Empty;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int DeviceId { get; set; }
    public UserDevice Device { get; set; } = null!;

    /// <summary>SHA-256 hex of the issued access token (for audit).</summary>
    public string JwtTokenHash { get; set; } = string.Empty;

    /// <summary>SHA-256 hex of the opaque refresh token.</summary>
    public string RefreshTokenHash { get; set; } = string.Empty;

    public DateTime LoginDate { get; set; } = DateTime.UtcNow;
    public DateTime ExpiryDate { get; set; }
    public DateTime RefreshExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LogoutDate { get; set; }
}
