using GymManagement.Core.DTOs.GymOps;

namespace GymManagement.Core.Services.GymOps
{
    public interface IMaintenanceLogService
    {
        Task<IEnumerable<MaintenanceLogDto>> GetAllAsync();
        Task<MaintenanceLogDto?> GetByIdAsync(int id);
        Task<MaintenanceLogDto> CreateAsync(CreateMaintenanceLogDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
