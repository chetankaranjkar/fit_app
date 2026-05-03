namespace GymManagement.Domain.Entities;

/// <summary>Rotating venue QR tokens for proximity check-in (<see cref="AttendanceLog.CheckInMethod"/> QR_SCAN).</summary>
public sealed class GymQrCode : BaseEntity
{
    public int BranchId { get; set; }
    /// <summary>Opaque token (RFC 4122 GUID string) encoded in QR; never reused across active codes.</summary>
    public string QrToken { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public bool IsActive { get; set; }
    /// <summary>UTC timestamp of last in-app expiry reminder persisted to <see cref="Notification"/> (dedupe).</summary>
    public DateTime? LastExpiryNotificationUtc { get; set; }

    public Branch Branch { get; set; } = null!;
}
