namespace GymManagement.Core.DTOs
{
    /// <summary>RBAC data for a successful login (profile user + app roles + effective permissions).</summary>
    public sealed class LoginRbacPayload
    {
        public UserProfileDto? Profile { get; init; }
        public IReadOnlyList<AppRoleDto> Roles { get; init; } = Array.Empty<AppRoleDto>();
        public IReadOnlyList<PermissionDto> Permissions { get; init; } = Array.Empty<PermissionDto>();
    }
}
