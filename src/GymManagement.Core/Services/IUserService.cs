using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;

namespace GymManagement.Core.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllUsersAsync(int? assignedToTrainerProfileId = null);
        Task<PagedResultDto<UserDto>> GetUsersPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            bool membersOnly = false,
            bool? isActive = null,
            bool includeBillingSummary = true,
            string? preferredGymTime = null,
            int? assignedToTrainerProfileId = null,
            bool countOnly = false);
        Task<int> GetMembersDirectoryCountAsync(
            bool? isActive = null,
            string? preferredGymTime = null,
            int? assignedToTrainerProfileId = null);
        Task<MembersDirectoryStatsDto> GetMembersDirectoryStatsAsync(int? assignedToTrainerProfileId = null);
        Task<UserDto?> GetUserByIdAsync(int id);
        Task<UserAggregateDto?> GetUserAggregateAsync(int id);
        Task<UserProfileSummaryDto?> GetUserProfileSummaryAsync(int userId);
        Task<UserDto> CreateUserAsync(CreateUserDto createUserDto);
        Task<BulkImportMembersResultDto> BulkImportMembersAsync(BulkImportMembersRequestDto request);
        Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto updateUserDto);
        Task<bool> DeleteUserAsync(int id);
        Task AssignRoleAsync(int userId, string roleCode);
        Task RevokeRoleAsync(int userId, string roleCode);
        Task<IEnumerable<UserDetailDto>> GetUserDetailsAsync(int userId);
        Task<UserDetailDto> AddUserDetailAsync(CreateUserDetailDto createUserDetailDto);
    }
}

