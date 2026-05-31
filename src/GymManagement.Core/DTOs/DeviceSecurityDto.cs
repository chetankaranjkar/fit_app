namespace GymManagement.Core.DTOs;

public class DeviceContextDto
{
    public string DeviceUniqueId { get; set; } = string.Empty;
    public string? DeviceName { get; set; }
    public string? DeviceModel { get; set; }
    public string? Platform { get; set; }
    public string? OsVersion { get; set; }
    public string? AppVersion { get; set; }
    public string? FirebaseUid { get; set; }
    /// <summary>Optional coarse location hint from client (city/country).</summary>
    public string? LocationHint { get; set; }
}

public class UserDeviceDto
{
    public int DeviceId { get; set; }
    public string DeviceUniqueId { get; set; } = string.Empty;
    public string? DeviceName { get; set; }
    public string? DeviceModel { get; set; }
    public string? Platform { get; set; }
    public string? AppVersion { get; set; }
    public bool IsActive { get; set; }
    public bool IsTrusted { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public string LastActiveLabel { get; set; } = string.Empty;
}

public class LoginHistoryDto
{
    public int LoginHistoryId { get; set; }
    public DateTime LoginDate { get; set; }
    public string DeviceLabel { get; set; } = string.Empty;
    public string LoginStatus { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public string? IPAddress { get; set; }
    public string? Location { get; set; }
    public bool IsSuspicious { get; set; }
}

public class SecurityAlertDto
{
    public bool IsNewDevice { get; set; }
    public bool IsUnusualLocation { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class DeviceLimitErrorDto
{
    public string Message { get; set; } = "Device limit reached. Remove an existing device to continue.";
    public int MaxDevices { get; set; }
    public IReadOnlyList<UserDeviceDto> ActiveDevices { get; set; } = Array.Empty<UserDeviceDto>();
}

public class DeviceSecurityAnalyticsDto
{
    public int TotalActiveDevices { get; set; }
    public int UsersWithMultipleDevices { get; set; }
    public int SuspiciousAccounts { get; set; }
    public int FailedLoginsToday { get; set; }
    public int DailyLogins { get; set; }
    public IReadOnlyList<PlatformStatDto> PlatformBreakdown { get; set; } = Array.Empty<PlatformStatDto>();
    public IReadOnlyList<AdminDeviceRowDto> RecentDevices { get; set; } = Array.Empty<AdminDeviceRowDto>();
}

public class PlatformStatDto
{
    public string Platform { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class AdminDeviceRowDto
{
    public int DeviceId { get; set; }
    public int UserId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string DeviceLabel { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public int ActiveSessionCount { get; set; }
    public int FailedAttempts { get; set; }
    public bool IsSuspicious { get; set; }
}

public class AdminDeviceFilterDto
{
    public string? Filter { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
