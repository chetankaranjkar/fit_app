using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    /// <summary>
    /// Resolves effective application roles and permissions for a user via <c>UserRoles</c> and <c>RolePermissions</c>.
    /// </summary>
    public interface IRbacService
    {
        /// <summary>
        /// Permission <b>codes</b> for the user via <c>UserRoles</c> → <c>RolePermissions</c> → <c>Permissions</c>.
        /// De-duplicated; sorted by code.
        /// </summary>
        Task<IReadOnlyList<string>> GetUserPermissionCodesAsync(int userId);

        /// <summary>
        /// Permissions granted to the user through all assigned roles (union, de-duplicated by permission id).
        /// </summary>
        Task<IReadOnlyList<PermissionDto>> GetUserPermissionsAsync(int userId);

        /// <summary>
        /// Application roles (<see cref="AppRoleDto"/>) assigned to the user via <c>UserRoles</c>.
        /// </summary>
        Task<IReadOnlyList<AppRoleDto>> GetUserAppRolesAsync(int userId);

        /// <summary>All permission codes defined in the system (for ADMIN effective set).</summary>
        Task<IReadOnlyList<string>> GetAllPermissionCodesAsync();
    }
}
