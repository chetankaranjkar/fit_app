using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserMembershipService
    {
        Task<IEnumerable<UserMembershipDto>> GetAllAsync();
        Task<IEnumerable<UserMembershipDto>> GetByUserIdAsync(int userId);
        Task<UserMembershipDto?> GetByIdAsync(int id);
        Task<UserMembershipDto> CreateAsync(CreateUserMembershipDto dto);
        Task<UserMembershipDto?> UpdateAsync(int id, UpdateUserMembershipDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
