using GymManagement.Core.DTOs.LockerMgmt;

namespace GymManagement.Core.Services.LockerMgmt
{
    public interface ILockerService
    {
        Task<IEnumerable<LockerDto>> GetAllAsync();
        Task<LockerDto?> GetByIdAsync(int id);
        Task<LockerDto> CreateAsync(CreateLockerDto dto);
        Task<LockerDto?> UpdateAsync(int id, UpdateLockerDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
