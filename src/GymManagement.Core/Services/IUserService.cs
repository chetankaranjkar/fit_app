using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllUsersAsync();
        Task<UserDto?> GetUserByIdAsync(int id);
        Task<UserDto> CreateUserAsync(CreateUserDto createUserDto);
        Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto updateUserDto);
        Task<bool> DeleteUserAsync(int id);
        Task<IEnumerable<UserDetailDto>> GetUserDetailsAsync(int userId);
        Task<UserDetailDto> AddUserDetailAsync(CreateUserDetailDto createUserDetailDto);
    }
}

