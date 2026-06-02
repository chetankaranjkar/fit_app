using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IDashboardService
    {
        Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
        Task<DashboardStatisticsDto> GetStatisticsAsync();
        Task<DashboardNotificationsDto> GetNotificationsAsync();
    }
}

