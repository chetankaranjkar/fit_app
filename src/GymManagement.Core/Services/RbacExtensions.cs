using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    /// <summary>Convenience helpers for <see cref="IRbacService"/>.</summary>
    public static class RbacExtensions
    {
        /// <summary>Resolves effective permission codes (see <see cref="IRbacService.GetUserPermissionCodesAsync"/>).</summary>
        public static Task<IReadOnlyList<string>> GetUserPermissionCodes(this IRbacService rbac, int userId) =>
            rbac.GetUserPermissionCodesAsync(userId);

        /// <summary>Resolves effective permissions for a user (see <see cref="IRbacService.GetUserPermissionsAsync"/>).</summary>
        public static Task<IReadOnlyList<PermissionDto>> GetUserPermissions(this IRbacService rbac, int userId) =>
            rbac.GetUserPermissionsAsync(userId);
    }
}
