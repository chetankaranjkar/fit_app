using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IRolePermissionService
    {
        Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync();
        Task<IEnumerable<AppRoleDto>> GetAllRolesAsync();
        Task<AppRoleDto?> GetRoleByIdAsync(int id);
        Task<AppRoleDto> CreateRoleAsync(CreateAppRoleDto dto);
        Task<AppRoleDto?> UpdateRoleAsync(int id, UpdateAppRoleDto dto);
        Task<bool> DeleteRoleAsync(int id);
    }
}
