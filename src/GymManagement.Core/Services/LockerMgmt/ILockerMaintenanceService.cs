using GymManagement.Core.DTOs.LockerMgmt;

namespace GymManagement.Core.Services.LockerMgmt
{
    public interface ILockerMaintenanceService
    {
        Task<IEnumerable<LockerMaintenanceDto>> GetAllAsync();
        Task<LockerMaintenanceDto> CreateAsync(CreateLockerMaintenanceDto dto);
        Task<LockerMaintenanceDto?> UpdateStatusAsync(int id, UpdateMaintenanceStatusDto dto);
    }
}
