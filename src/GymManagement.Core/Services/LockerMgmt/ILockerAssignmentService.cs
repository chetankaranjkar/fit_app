using GymManagement.Core.DTOs.LockerMgmt;

namespace GymManagement.Core.Services.LockerMgmt
{
    public interface ILockerAssignmentService
    {
        Task<IEnumerable<LockerAssignmentDto>> GetAllAsync();
        Task<LockerAssignmentDto?> GetByIdAsync(int id);
        Task<LockerAssignmentDto> CreateAsync(CreateLockerAssignmentDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
