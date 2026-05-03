namespace GymManagement.Core.DTOs;

public sealed class QrGenerateRequestDto
{
    public int BranchId { get; set; }
}

public sealed class QrGenerateResponseDto
{
    public int GymQrCodeId { get; set; }
    public int BranchId { get; set; }
    public string QrToken { get; set; } = string.Empty;
    public DateTime ExpiryDateUtc { get; set; }
    public DateTime CreatedDateUtc { get; set; }
}

public sealed class QrScanRequestDto
{
    public string QrToken { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public sealed class QrScanResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int? AttendanceLogId { get; set; }
    public bool DoorUnlockAttempted { get; set; }
    public bool DoorUnlockOk { get; set; }
    /// <summary>Set when <see cref="Success"/> is true — venue branch for workout session integration.</summary>
    public int? BranchId { get; set; }
}

public sealed class BranchOptionDto
{
    public int Id { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Esp32DoorBaseUrl { get; set; }
}

/// <summary>PUT body for geo + branch-specific ESP32 URL.</summary>
public sealed class BranchQrAccessPutDto
{
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Esp32DoorBaseUrl { get; set; }
}

public sealed class QrScanLogDto
{
    public int AttendanceLogId { get; set; }
    public DateTime CheckInTimeUtc { get; set; }
    public string? Notes { get; set; }
    public int? UserId { get; set; }
    public string? MemberName { get; set; }
}

public sealed class QrOwnerDashboardDto
{
    public QrGenerateResponseDto? ActiveQr { get; set; }
    public bool ExpiresWithinThreeDays { get; set; }
    /// <summary>False when the branch row exists but <c>IsActive</c> is off (generate is blocked until reactivated).</summary>
    public bool BranchIsActive { get; set; } = true;
    public bool BranchGeoConfigured { get; set; }
    public bool BranchDoorUrlConfigured { get; set; }
    public double? BranchLatitude { get; set; }
    public double? BranchLongitude { get; set; }
    public string? Esp32DoorBaseUrl { get; set; }
    public string? BranchName { get; set; }
    public IReadOnlyList<QrScanLogDto> RecentScans { get; set; } = Array.Empty<QrScanLogDto>();
}

public sealed class DoorUnlockRequestDto
{
    /// <summary>Optional override for testing (ignored unless <c>DoorDevice:AllowOverrideBaseUrl</c>).</summary>
    public string? DeviceBaseUrl { get; set; }

    /// <summary>When set, the branch row's <c>Esp32DoorBaseUrl</c> is used when present (before global default).</summary>
    public int? BranchId { get; set; }
}

public sealed class DoorUnlockResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}
