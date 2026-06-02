using GymManagement.Core.Interfaces.Caching;
using Microsoft.Extensions.Caching.Memory;

namespace GymManagement.Infrastructure.Caching
{
    public sealed class MemoryAppCache : IAppCache
    {
        private readonly IMemoryCache _cache;

        public MemoryAppCache(IMemoryCache cache) => _cache = cache;

        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
        {
            _ = cancellationToken;
            return Task.FromResult(_cache.TryGetValue(key, out T? value) ? value : default);
        }

        public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null, CancellationToken cancellationToken = default)
        {
            _ = cancellationToken;
            _cache.Set(key, value, absoluteExpiration ?? TimeSpan.FromMinutes(5));
            return Task.CompletedTask;
        }

        public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        {
            _ = cancellationToken;
            _cache.Remove(key);
            return Task.CompletedTask;
        }
    }
}
