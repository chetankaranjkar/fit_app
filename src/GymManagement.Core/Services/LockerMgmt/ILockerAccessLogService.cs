using GymManagement.Core.DTOs.LockerMgmt;

namespace GymManagement.Core.Services.LockerMgmt
{
    public interface ILockerAccessLogService
    {
        Task<IEnumerable<LockerAccessLogDto>> GetAllAsync();
        Task<LockerAccessLogDto> CreateAsync(CreateLockerAccessLogDto dto);
    }
}
