using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserTypeService
    {
        Task<IEnumerable<UserTypeDto>> GetAllAsync();
        Task<UserTypeDto?> GetByIdAsync(int id);
        Task<UserTypeDto> CreateAsync(CreateUserTypeDto dto);
        Task<UserTypeDto?> UpdateAsync(int id, UpdateUserTypeDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
