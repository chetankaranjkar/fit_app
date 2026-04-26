using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    /// <summary>
    /// Builds login payload slices (profile + RBAC) after <see cref="AuthUser"/> credentials are validated.
    /// Keeps role/permission loading out of the auth credential path.
    /// </summary>
    public interface ILoginPayloadFactory
    {
        /// <summary>
        /// Loads <see cref="User"/> by resolved profile id, then roles via <c>UserRoles</c> and permissions via <c>RolePermissions</c>.
        /// </summary>
        Task<LoginRbacPayload> BuildProfileAndRbacAsync(AuthUser authUser);
    }
}
