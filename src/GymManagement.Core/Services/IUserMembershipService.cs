using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    public interface IUserMembershipService
    {
        Task<IEnumerable<UserMembershipDto>> GetAllAsync();
        Task<PagedResultDto<UserMembershipDto>> GetPagedAsync(int page, int pageSize, string? search = null, MembershipStatus? status = null);
        Task<IEnumerable<UserMembershipDto>> GetByUserIdAsync(int userId);
        Task<UserMembershipDto?> GetByIdAsync(int id);
        Task<UserMembershipDto> CreateAsync(CreateUserMembershipDto dto);
        Task<UserMembershipDto?> UpdateAsync(int id, UpdateUserMembershipDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
