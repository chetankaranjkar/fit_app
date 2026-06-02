using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;

namespace GymManagement.Core.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllUsersAsync();
        Task<PagedResultDto<UserDto>> GetUsersPagedAsync(int page, int pageSize, string? search = null, bool membersOnly = false, bool? isActive = null);
        Task<UserDto?> GetUserByIdAsync(int id);
        Task<UserAggregateDto?> GetUserAggregateAsync(int id);
        Task<UserDto> CreateUserAsync(CreateUserDto createUserDto);
        Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto updateUserDto);
        Task<bool> DeleteUserAsync(int id);
        Task AssignRoleAsync(int userId, string roleCode);
        Task RevokeRoleAsync(int userId, string roleCode);
        Task<IEnumerable<UserDetailDto>> GetUserDetailsAsync(int userId);
        Task<UserDetailDto> AddUserDetailAsync(CreateUserDetailDto createUserDetailDto);
    }
}

