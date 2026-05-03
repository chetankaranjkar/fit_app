using GymManagement.Core.Services;

namespace GymManagement.Infrastructure.Services;

/// <summary>Used when Redis is not configured — replay protection and rate limits are skipped.</summary>
public sealed class NoOpRedisGymSecurityService : IRedisGymSecurityService
{
    public Task<bool> TryRegisterClientScanIdAsync(Guid clientScanId, CancellationToken cancellationToken = default) =>
        Task.FromResult(true);

    public Task<bool> AllowScanRateLimitAsync(int memberUserId, CancellationToken cancellationToken = default) =>
        Task.FromResult(true);
}
