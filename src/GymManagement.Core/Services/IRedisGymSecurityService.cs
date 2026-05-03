namespace GymManagement.Core.Services;

/// <summary>Redis-backed replay protection and scan rate limiting.</summary>
public interface IRedisGymSecurityService
{
    /// <summary>Registers a one-time client scan id (120s TTL). Returns false if already used (replay).</summary>
    Task<bool> TryRegisterClientScanIdAsync(Guid clientScanId, CancellationToken cancellationToken = default);

    /// <summary>Sliding-window: max 5 scans per 60 seconds per user. Returns false if over limit.</summary>
    Task<bool> AllowScanRateLimitAsync(int memberUserId, CancellationToken cancellationToken = default);
}
