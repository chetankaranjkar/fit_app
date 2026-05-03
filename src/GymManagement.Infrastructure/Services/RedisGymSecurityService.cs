using GymManagement.Core.Services;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace GymManagement.Infrastructure.Services;

public sealed class RedisGymSecurityService : IRedisGymSecurityService
{
    private readonly IConnectionMultiplexer _mux;
    private readonly ILogger<RedisGymSecurityService> _logger;

    public RedisGymSecurityService(IConnectionMultiplexer mux, ILogger<RedisGymSecurityService> logger)
    {
        _mux = mux;
        _logger = logger;
    }

    public async Task<bool> TryRegisterClientScanIdAsync(Guid clientScanId, CancellationToken cancellationToken = default)
    {
        if (clientScanId == Guid.Empty) return false;
        try
        {
            var db = _mux.GetDatabase();
            var key = $"gym:qr:jti:{clientScanId:D}";
            var ok = await db.StringSetAsync(key, "1", TimeSpan.FromSeconds(120), When.NotExists).ConfigureAwait(false);
            return ok;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis replay check failed; allowing request.");
            return true;
        }
    }

    public async Task<bool> AllowScanRateLimitAsync(int memberUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            var db = _mux.GetDatabase();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var key = $"gym:qr:rl:{memberUserId}";
            await db.SortedSetAddAsync(key, Guid.NewGuid().ToString("N"), now).ConfigureAwait(false);
            await db.SortedSetRemoveRangeByScoreAsync(key, double.NegativeInfinity, now - 60).ConfigureAwait(false);
            var count = await db.SortedSetLengthAsync(key).ConfigureAwait(false);
            await db.KeyExpireAsync(key, TimeSpan.FromMinutes(2)).ConfigureAwait(false);
            return count <= 5;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis rate limit failed; allowing request.");
            return true;
        }
    }
}
