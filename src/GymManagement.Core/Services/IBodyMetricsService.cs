using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    /// <summary>
    /// Body metrics history only. Latest snapshot is in UserDetails (via Users API).
    /// </summary>
    public interface IBodyMetricsService
    {
        Task<IEnumerable<BodyMetricsLogDto>> GetBodyMetricsLogsByUserIdAsync(int userId);
        Task<BodyMetricsLogDto?> GetLatestBodyMetricsByUserIdAsync(int userId);
        Task<BodyMetricsLogDto?> GetCurrentBodyMetricsByUserIdAsync(int userId);
        Task<BodyMetricsLogDto> CreateBodyMetricsLogAsync(CreateBodyMetricsLogDto dto);
        Task<BodyMetricsLogDto?> UpdateBodyMetricsLogAsync(int id, UpdateBodyMetricsLogDto dto, string? changedByUser);
        Task<bool> DeleteBodyMetricsLogAsync(int id, string? changedByUser);
    }
}
