namespace GymManagement.Domain.Entities;

/// <summary>Per-login audit row for device-aware authentication.</summary>
public class LoginHistoryEntry : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int? DeviceId { get; set; }
    public UserDevice? Device { get; set; }

    public DateTime LoginDate { get; set; } = DateTime.UtcNow;

    /// <summary>Successful, Failed, Blocked.</summary>
    public string LoginStatus { get; set; } = "Successful";

    public string? Platform { get; set; }
    public string? AppVersion { get; set; }
    public string? IPAddress { get; set; }
    public string? Location { get; set; }
    public string? FailureReason { get; set; }
    public bool IsSuspicious { get; set; }
}
