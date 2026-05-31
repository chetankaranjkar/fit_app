namespace GymManagement.Domain.Entities;

/// <summary>Registered mobile / client device for a gym member account.</summary>
public class UserDevice : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Stable hardware id from the client (UUID persisted on device).</summary>
    public string DeviceUniqueId { get; set; } = string.Empty;

    public string? DeviceName { get; set; }
    public string? DeviceModel { get; set; }
    public string? Platform { get; set; }
    public string? OsVersion { get; set; }
    public string? AppVersion { get; set; }
    public string? FirebaseUid { get; set; }

    public bool IsActive { get; set; } = true;
    /// <summary>First registered device for the user is marked trusted.</summary>
    public bool IsTrusted { get; set; }
    public DateTime? LastLoginDate { get; set; }

    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<LoginHistoryEntry> LoginHistory { get; set; } = new List<LoginHistoryEntry>();
}
