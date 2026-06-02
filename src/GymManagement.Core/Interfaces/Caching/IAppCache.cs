namespace GymManagement.Core.Interfaces.Caching
{
    /// <summary>Optional Redis-backed implementation can replace this in production.</summary>
    public interface IAppCache
    {
        Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
        Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null, CancellationToken cancellationToken = default);
        Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    }
}
