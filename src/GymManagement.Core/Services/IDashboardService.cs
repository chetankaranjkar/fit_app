using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IDashboardService
    {
        Task<DashboardStatisticsDto> GetStatisticsAsync();
        Task<DashboardNotificationsDto> GetNotificationsAsync();
    }
}

