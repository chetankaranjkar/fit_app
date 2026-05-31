using System.Security.Cryptography;
using System.Text;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Configuration;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services;

public sealed class DeviceSessionService : IDeviceSessionService
{
    private readonly ApplicationDbContext _db;
    private readonly DeviceSecurityOptions _options;
    private readonly ILogger<DeviceSessionService> _logger;

    public DeviceSessionService(
        ApplicationDbContext db,
        IOptions<DeviceSecurityOptions> options,
        ILogger<DeviceSessionService> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<LoginAttemptResultDto> TryEstablishMobileSessionAsync(
        AuthUserContext authUser,
        LoginDto loginDto,
        string sessionId,
        string accessToken,
        string refreshTokenPlain,
        DateTime accessExpiry,
        DateTime refreshExpiry,
        CancellationToken cancellationToken = default)
    {
        var deviceCtx = loginDto.Device;
        if (deviceCtx == null || string.IsNullOrWhiteSpace(deviceCtx.DeviceUniqueId) || !authUser.UserId.HasValue)
            return new LoginAttemptResultDto { Skipped = true };

        var userId = authUser.UserId.Value;
        var uniqueId = deviceCtx.DeviceUniqueId.Trim();

        if (loginDto.RemoveDeviceId is > 0)
        {
            var removed = await RemoveDeviceAsync(userId, loginDto.RemoveDeviceId.Value, cancellationToken)
                .ConfigureAwait(false);
            if (!removed)
                _logger.LogWarning("RemoveDeviceId {DeviceId} not found for user {UserId}", loginDto.RemoveDeviceId, userId);
        }

        var existingDevice = await _db.UserDevices
            .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceUniqueId == uniqueId && !d.IsDeleted, cancellationToken)
            .ConfigureAwait(false);

        if (existingDevice == null)
        {
            var activeCount = await _db.UserDevices
                .CountAsync(d => d.UserId == userId && d.IsActive && !d.IsDeleted, cancellationToken)
                .ConfigureAwait(false);

            if (activeCount >= _options.MaxActiveDevices)
            {
                var devices = await GetUserDevicesAsync(userId, uniqueId, cancellationToken).ConfigureAwait(false);
                await RecordFailedLoginAsync(userId, deviceCtx, null, "Device limit reached", blocked: true, cancellationToken)
                    .ConfigureAwait(false);

                return new LoginAttemptResultDto
                {
                    DeviceLimit = new DeviceLimitLoginResponseDto
                    {
                        DeviceLimit = new DeviceLimitErrorDto
                        {
                            MaxDevices = _options.MaxActiveDevices,
                            ActiveDevices = devices
                        }
                    }
                };
            }

            var hasAnyDevice = await _db.UserDevices
                .AnyAsync(d => d.UserId == userId && !d.IsDeleted, cancellationToken)
                .ConfigureAwait(false);

            existingDevice = new UserDevice
            {
                UserId = userId,
                DeviceUniqueId = uniqueId,
                DeviceName = Trim(deviceCtx.DeviceName, 128),
                DeviceModel = Trim(deviceCtx.DeviceModel, 128),
                Platform = Trim(deviceCtx.Platform, 64),
                OsVersion = Trim(deviceCtx.OsVersion, 64),
                AppVersion = Trim(deviceCtx.AppVersion, 32),
                FirebaseUid = Trim(deviceCtx.FirebaseUid, 128),
                IsActive = true,
                IsTrusted = !hasAnyDevice,
                LastLoginDate = DateTime.UtcNow,
                CreatedDate = DateTime.UtcNow
            };
            await _db.UserDevices.AddAsync(existingDevice, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            existingDevice.DeviceName = Trim(deviceCtx.DeviceName, 128) ?? existingDevice.DeviceName;
            existingDevice.DeviceModel = Trim(deviceCtx.DeviceModel, 128) ?? existingDevice.DeviceModel;
            existingDevice.Platform = Trim(deviceCtx.Platform, 64) ?? existingDevice.Platform;
            existingDevice.OsVersion = Trim(deviceCtx.OsVersion, 64) ?? existingDevice.OsVersion;
            existingDevice.AppVersion = Trim(deviceCtx.AppVersion, 32) ?? existingDevice.AppVersion;
            existingDevice.FirebaseUid = Trim(deviceCtx.FirebaseUid, 128) ?? existingDevice.FirebaseUid;
            existingDevice.IsActive = true;
            existingDevice.LastLoginDate = DateTime.UtcNow;
            existingDevice.UpdatedDate = DateTime.UtcNow;
        }

        var alert = await DetectSuspiciousLoginAsync(userId, existingDevice, deviceCtx, cancellationToken)
            .ConfigureAwait(false);

        if (existingDevice.Id == 0)
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var session = new UserSession
        {
            SessionId = sessionId,
            UserId = userId,
            DeviceId = existingDevice.Id,
            JwtTokenHash = ComputeTokenHash(accessToken),
            RefreshTokenHash = ComputeTokenHash(refreshTokenPlain),
            LoginDate = DateTime.UtcNow,
            ExpiryDate = accessExpiry,
            RefreshExpiryDate = refreshExpiry,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        await _db.UserSessions.AddAsync(session, cancellationToken).ConfigureAwait(false);

        await _db.LoginHistoryEntries.AddAsync(new LoginHistoryEntry
        {
            UserId = userId,
            DeviceId = existingDevice.Id,
            LoginDate = DateTime.UtcNow,
            LoginStatus = LoginHistoryStatus.Successful,
            Platform = existingDevice.Platform,
            AppVersion = existingDevice.AppVersion,
            IPAddress = null,
            Location = Trim(deviceCtx.LocationHint, 256),
            IsSuspicious = alert != null,
            CreatedDate = DateTime.UtcNow
        }, cancellationToken).ConfigureAwait(false);

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new LoginAttemptResultDto
        {
            Success = new LoginResponseDto
            {
                SessionId = sessionId,
                DeviceId = existingDevice.Id,
                SecurityAlert = alert
            }
        };
    }

    public Task<UserSession?> ValidateSessionAsync(string sessionId, CancellationToken cancellationToken = default) =>
        _db.UserSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s =>
                s.SessionId == sessionId
                && s.IsActive
                && !s.IsDeleted
                && s.ExpiryDate > DateTime.UtcNow, cancellationToken);

    public async Task<bool> IsSessionAllowedAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _db.UserSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && !s.IsDeleted, cancellationToken)
            .ConfigureAwait(false);
        if (session == null)
            return true;
        return session.IsActive && session.ExpiryDate > DateTime.UtcNow;
    }

    public Task<UserSession?> FindSessionByRefreshTokenAsync(string refreshTokenPlain, CancellationToken cancellationToken = default)
    {
        var hash = ComputeTokenHash(refreshTokenPlain);
        return _db.UserSessions
            .Include(s => s.Device)
            .FirstOrDefaultAsync(s =>
                s.RefreshTokenHash == hash
                && s.IsActive
                && !s.IsDeleted
                && s.RefreshExpiryDate > DateTime.UtcNow, cancellationToken);
    }

    public async Task RotateSessionTokensAsync(
        UserSession session,
        string newSessionId,
        string accessToken,
        string refreshTokenPlain,
        DateTime accessExpiry,
        DateTime refreshExpiry,
        CancellationToken cancellationToken = default)
    {
        session.SessionId = newSessionId;
        session.JwtTokenHash = ComputeTokenHash(accessToken);
        session.RefreshTokenHash = ComputeTokenHash(refreshTokenPlain);
        session.ExpiryDate = accessExpiry;
        session.RefreshExpiryDate = refreshExpiry;
        session.UpdatedDate = DateTime.UtcNow;
        _db.UserSessions.Update(session);

        if (session.Device != null)
        {
            session.Device.LastLoginDate = DateTime.UtcNow;
            session.Device.UpdatedDate = DateTime.UtcNow;
            _db.UserDevices.Update(session.Device);
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task InvalidateSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _db.UserSessions
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && !s.IsDeleted, cancellationToken)
            .ConfigureAwait(false);
        if (session == null) return;

        session.IsActive = false;
        session.LogoutDate = DateTime.UtcNow;
        session.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task InvalidateAllUserSessionsAsync(int userId, CancellationToken cancellationToken = default)
    {
        var sessions = await _db.UserSessions
            .Where(s => s.UserId == userId && s.IsActive && !s.IsDeleted)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var now = DateTime.UtcNow;
        foreach (var session in sessions)
        {
            session.IsActive = false;
            session.LogoutDate = now;
            session.UpdatedDate = now;
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task InvalidateDeviceSessionsAsync(int deviceId, CancellationToken cancellationToken = default)
    {
        var sessions = await _db.UserSessions
            .Where(s => s.DeviceId == deviceId && s.IsActive && !s.IsDeleted)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var now = DateTime.UtcNow;
        foreach (var session in sessions)
        {
            session.IsActive = false;
            session.LogoutDate = now;
            session.UpdatedDate = now;
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<UserDeviceDto>> GetUserDevicesAsync(
        int userId,
        string? currentDeviceUniqueId,
        CancellationToken cancellationToken = default)
    {
        var devices = await _db.UserDevices
            .AsNoTracking()
            .Where(d => d.UserId == userId && d.IsActive && !d.IsDeleted)
            .OrderByDescending(d => d.LastLoginDate ?? d.CreatedDate)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return devices.Select(d => MapDevice(d, currentDeviceUniqueId)).ToList();
    }

    public async Task<bool> RemoveDeviceAsync(int userId, int deviceId, CancellationToken cancellationToken = default)
    {
        var device = await _db.UserDevices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId && !d.IsDeleted, cancellationToken)
            .ConfigureAwait(false);
        if (device == null) return false;

        device.IsActive = false;
        device.UpdatedDate = DateTime.UtcNow;
        await InvalidateDeviceSessionsAsync(deviceId, cancellationToken).ConfigureAwait(false);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<IReadOnlyList<LoginHistoryDto>> GetLoginHistoryAsync(
        int userId,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.LoginHistoryEntries
            .AsNoTracking()
            .Include(h => h.Device)
            .Where(h => h.UserId == userId && !h.IsDeleted)
            .OrderByDescending(h => h.LoginDate)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return rows.Select(h => new LoginHistoryDto
        {
            LoginHistoryId = h.Id,
            LoginDate = h.LoginDate,
            DeviceLabel = FormatDeviceLabel(h.Device),
            LoginStatus = h.LoginStatus,
            Platform = h.Platform,
            IPAddress = h.IPAddress,
            Location = h.Location,
            IsSuspicious = h.IsSuspicious
        }).ToList();
    }

    public async Task<DeviceSecurityAnalyticsDto> GetAdminAnalyticsAsync(
        AdminDeviceFilterDto filter,
        CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var q = filter.Search?.Trim().ToLowerInvariant();

        var devicesQuery = _db.UserDevices.AsNoTracking().Where(d => d.IsActive && !d.IsDeleted);
        var sessionsQuery = _db.UserSessions.AsNoTracking().Where(s => s.IsActive && !s.IsDeleted);
        var historyQuery = _db.LoginHistoryEntries.AsNoTracking().Where(h => !h.IsDeleted);

        var totalActiveDevices = await devicesQuery.CountAsync(cancellationToken).ConfigureAwait(false);
        var usersWithMultiple = await devicesQuery
            .GroupBy(d => d.UserId)
            .Where(g => g.Count() > 1)
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);

        var suspiciousAccounts = await historyQuery
            .Where(h => h.IsSuspicious && h.LoginDate >= today.AddDays(-30))
            .Select(h => h.UserId)
            .Distinct()
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);

        var failedToday = await historyQuery
            .CountAsync(h => h.LoginDate >= today && h.LoginStatus == LoginHistoryStatus.Failed, cancellationToken)
            .ConfigureAwait(false);

        var dailyLogins = await historyQuery
            .CountAsync(h => h.LoginDate >= today && h.LoginStatus == LoginHistoryStatus.Successful, cancellationToken)
            .ConfigureAwait(false);

        var platformBreakdown = await devicesQuery
            .GroupBy(d => d.Platform ?? "Unknown")
            .Select(g => new PlatformStatDto { Platform = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        IQueryable<UserDevice> recentDevicesQuery = devicesQuery
            .Include(d => d.User)
            .OrderByDescending(d => d.LastLoginDate ?? d.CreatedDate);

        if (string.Equals(filter.Filter, "multiple", StringComparison.OrdinalIgnoreCase))
        {
            var multiUserIds = await devicesQuery
                .GroupBy(d => d.UserId)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            recentDevicesQuery = recentDevicesQuery.Where(d => multiUserIds.Contains(d.UserId));
        }
        else if (string.Equals(filter.Filter, "suspicious", StringComparison.OrdinalIgnoreCase))
        {
            var suspiciousUserIds = await historyQuery
                .Where(h => h.IsSuspicious)
                .Select(h => h.UserId)
                .Distinct()
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            recentDevicesQuery = recentDevicesQuery.Where(d => suspiciousUserIds.Contains(d.UserId));
        }

        if (!string.IsNullOrEmpty(q))
        {
            recentDevicesQuery = recentDevicesQuery.Where(d =>
                (d.DeviceName != null && d.DeviceName.ToLower().Contains(q))
                || (d.DeviceModel != null && d.DeviceModel.ToLower().Contains(q))
                || (d.User.FirstName + " " + d.User.LastName).ToLower().Contains(q));
        }

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);
        var skip = (page - 1) * pageSize;

        var recentDevices = await recentDevicesQuery
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var userIds = recentDevices.Select(d => d.UserId).Distinct().ToList();
        var authEmails = await _db.AuthUsers.AsNoTracking()
            .Where(a => a.UserId != null && userIds.Contains(a.UserId.Value))
            .Select(a => new { a.UserId, a.Email })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var sessionCounts = await sessionsQuery
            .Where(s => recentDevices.Select(d => d.Id).Contains(s.DeviceId))
            .GroupBy(s => s.DeviceId)
            .Select(g => new { DeviceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DeviceId, x => x.Count, cancellationToken)
            .ConfigureAwait(false);

        var failedByUser = await historyQuery
            .Where(h => userIds.Contains(h.UserId) && h.LoginStatus == LoginHistoryStatus.Failed)
            .GroupBy(h => h.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken)
            .ConfigureAwait(false);

        var suspiciousUserSet = await historyQuery
            .Where(h => userIds.Contains(h.UserId) && h.IsSuspicious)
            .Select(h => h.UserId)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var rows = recentDevices.Select(d =>
        {
            var email = authEmails.FirstOrDefault(a => a.UserId == d.UserId)?.Email;
            return new AdminDeviceRowDto
            {
                DeviceId = d.Id,
                UserId = d.UserId,
                MemberName = $"{d.User.FirstName} {d.User.LastName}".Trim(),
                Email = email,
                DeviceLabel = FormatDeviceLabel(d),
                Platform = d.Platform,
                LastLoginDate = d.LastLoginDate,
                ActiveSessionCount = sessionCounts.GetValueOrDefault(d.Id),
                FailedAttempts = failedByUser.GetValueOrDefault(d.UserId),
                IsSuspicious = suspiciousUserSet.Contains(d.UserId)
            };
        }).ToList();

        return new DeviceSecurityAnalyticsDto
        {
            TotalActiveDevices = totalActiveDevices,
            UsersWithMultipleDevices = usersWithMultiple,
            SuspiciousAccounts = suspiciousAccounts,
            FailedLoginsToday = failedToday,
            DailyLogins = dailyLogins,
            PlatformBreakdown = platformBreakdown,
            RecentDevices = rows
        };
    }

    public async Task RecordFailedLoginAsync(
        int? userId,
        DeviceContextDto? device,
        string? ipAddress,
        string reason,
        bool blocked,
        CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue) return;

        int? deviceId = null;
        if (device != null && !string.IsNullOrWhiteSpace(device.DeviceUniqueId))
        {
            var existing = await _db.UserDevices
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceUniqueId == device.DeviceUniqueId.Trim(), cancellationToken)
                .ConfigureAwait(false);
            deviceId = existing?.Id;
        }

        await _db.LoginHistoryEntries.AddAsync(new LoginHistoryEntry
        {
            UserId = userId.Value,
            DeviceId = deviceId,
            LoginDate = DateTime.UtcNow,
            LoginStatus = blocked ? LoginHistoryStatus.Blocked : LoginHistoryStatus.Failed,
            Platform = Trim(device?.Platform, 64),
            AppVersion = Trim(device?.AppVersion, 32),
            IPAddress = Trim(ipAddress, 64),
            Location = Trim(device?.LocationHint, 256),
            FailureReason = Trim(reason, 255),
            CreatedDate = DateTime.UtcNow
        }, cancellationToken).ConfigureAwait(false);

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task<SecurityAlertDto?> DetectSuspiciousLoginAsync(
        int userId,
        UserDevice device,
        DeviceContextDto deviceCtx,
        CancellationToken cancellationToken)
    {
        var priorLogins = await _db.LoginHistoryEntries
            .AsNoTracking()
            .Where(h => h.UserId == userId && h.LoginStatus == LoginHistoryStatus.Successful && !h.IsDeleted)
            .OrderByDescending(h => h.LoginDate)
            .Take(20)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var isNewDevice = !priorLogins.Any(h => h.DeviceId == device.Id && device.Id > 0);
        if (device.Id == 0)
            isNewDevice = true;

        var priorLocations = priorLogins
            .Select(h => h.Location)
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var currentLocation = Trim(deviceCtx.LocationHint, 256);
        var unusualLocation = !string.IsNullOrWhiteSpace(currentLocation)
            && priorLocations.Count > 0
            && !priorLocations.Any(l => string.Equals(l, currentLocation, StringComparison.OrdinalIgnoreCase));

        if (!isNewDevice && !unusualLocation)
            return null;

        var parts = new List<string>();
        if (isNewDevice) parts.Add("New device detected");
        if (unusualLocation) parts.Add("Sign-in from a different location");

        return new SecurityAlertDto
        {
            IsNewDevice = isNewDevice,
            IsUnusualLocation = unusualLocation,
            Message = string.Join(". ", parts) + "."
        };
    }

    private static UserDeviceDto MapDevice(UserDevice d, string? currentDeviceUniqueId) =>
        new()
        {
            DeviceId = d.Id,
            DeviceUniqueId = d.DeviceUniqueId,
            DeviceName = d.DeviceName,
            DeviceModel = d.DeviceModel,
            Platform = d.Platform,
            AppVersion = d.AppVersion,
            IsActive = d.IsActive,
            IsTrusted = d.IsTrusted,
            IsCurrent = !string.IsNullOrWhiteSpace(currentDeviceUniqueId)
                && string.Equals(d.DeviceUniqueId, currentDeviceUniqueId, StringComparison.OrdinalIgnoreCase),
            LastLoginDate = d.LastLoginDate,
            LastActiveLabel = FormatLastActive(d.LastLoginDate)
        };

    private static string FormatDeviceLabel(UserDevice? device)
    {
        if (device == null) return "Unknown Device";
        if (!string.IsNullOrWhiteSpace(device.DeviceName)) return device.DeviceName!;
        if (!string.IsNullOrWhiteSpace(device.DeviceModel)) return device.DeviceModel!;
        if (!string.IsNullOrWhiteSpace(device.Platform)) return device.Platform!;
        return "Unknown Device";
    }

    private static string FormatLastActive(DateTime? lastLogin)
    {
        if (lastLogin == null) return "Never";
        var delta = DateTime.UtcNow - lastLogin.Value;
        if (delta.TotalMinutes < 60) return "Today";
        if (delta.TotalHours < 48) return "Yesterday";
        var days = (int)delta.TotalDays;
        if (days == 1) return "1 Day Ago";
        return $"{days} Days Ago";
    }

    public static string ComputeTokenHash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }

    private static string? Trim(string? value, int max) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim().Length > max ? value.Trim()[..max] : value.Trim();
}
