using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services;

public interface IDeviceSessionService
{
    Task<LoginAttemptResultDto> TryEstablishMobileSessionAsync(
        AuthUserContext authUser,
        LoginDto loginDto,
        string sessionId,
        string accessToken,
        string refreshTokenPlain,
        DateTime accessExpiry,
        DateTime refreshExpiry,
        CancellationToken cancellationToken = default);

    Task<UserSession?> ValidateSessionAsync(string sessionId, CancellationToken cancellationToken = default);

    /// <summary>Returns false when a tracked mobile session exists but is revoked/expired.</summary>
    Task<bool> IsSessionAllowedAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<UserSession?> FindSessionByRefreshTokenAsync(string refreshTokenPlain, CancellationToken cancellationToken = default);

    Task RotateSessionTokensAsync(
        UserSession session,
        string newSessionId,
        string accessToken,
        string refreshTokenPlain,
        DateTime accessExpiry,
        DateTime refreshExpiry,
        CancellationToken cancellationToken = default);

    Task InvalidateSessionAsync(string sessionId, CancellationToken cancellationToken = default);

    Task InvalidateAllUserSessionsAsync(int userId, CancellationToken cancellationToken = default);

    Task InvalidateDeviceSessionsAsync(int deviceId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<UserDeviceDto>> GetUserDevicesAsync(int userId, string? currentDeviceUniqueId, CancellationToken cancellationToken = default);

    Task<bool> RemoveDeviceAsync(int userId, int deviceId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LoginHistoryDto>> GetLoginHistoryAsync(int userId, int take = 50, CancellationToken cancellationToken = default);

    Task<DeviceSecurityAnalyticsDto> GetAdminAnalyticsAsync(AdminDeviceFilterDto filter, CancellationToken cancellationToken = default);

    Task RecordFailedLoginAsync(
        int? userId,
        DeviceContextDto? device,
        string? ipAddress,
        string reason,
        bool blocked,
        CancellationToken cancellationToken = default);
}

/// <summary>Minimal auth user context for device session establishment.</summary>
public sealed class AuthUserContext
{
    public int AuthUserId { get; init; }
    public int? UserId { get; init; }
    public string Email { get; init; } = string.Empty;
}
