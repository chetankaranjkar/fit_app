using System;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class LoginDto
    {
        /// <summary>Account email (preferred). If empty, <see cref="Username"/> is used.</summary>
        public string? Email { get; set; }
        /// <summary>Login identifier when <see cref="Email"/> is not set (typically email). Short form <c>admin</c> maps to the seeded admin email.</summary>
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        /// <summary>Optional legacy field. Ignored by the server; role is resolved from the account after authentication.</summary>
        /// <remarks>Step 1B: deprecated — do not rely on this property; it may be removed in a future API version.</remarks>
        [Obsolete("Login ignores client-sent role; the API resolves Role from UserRoles (fallback: default admin, user types). Will be removed in a future version.")]
        public Role? Role { get; set; }
    }

    /// <summary>
    /// Successful login payload: JWT access token, rotated refresh token, profile + RBAC, and audit correlation.
    /// Flow: <c>AuthUsers</c> (credentials) → <c>Users</c> (profile) → <c>UserRoles</c>/<c>Roles</c> → <c>RolePermissions</c>/<c>Permissions</c> → tokens → <c>LoginActivity</c>.
    /// </summary>
    public class LoginResponseDto
    {
        /// <summary>JWT access token (Bearer).</summary>
        public string Token { get; set; } = string.Empty;
        /// <summary>Opaque refresh token; store securely. Hashed in <c>AuthUsers.RefreshToken</c>.</summary>
        public string RefreshToken { get; set; } = string.Empty;
        /// <summary>UTC expiry for the refresh token.</summary>
        public DateTime? RefreshTokenExpiresAt { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        /// <summary>Legacy coarse role for the JWT <c>role</c> claim (derived from RBAC + fallbacks, not stored on <c>AuthUsers</c>).</summary>
        public Role Role { get; set; }
        public int? UserId { get; set; }
        public int? TrainerId { get; set; }
        public string FullName { get; set; } = string.Empty;
        /// <summary><c>Users</c> profile when the account links to a member/trainer profile.</summary>
        public UserProfileDto? Profile { get; set; }
        /// <summary>Application roles from <c>UserRoles</c> → <c>Roles</c>.</summary>
        public IReadOnlyList<AppRoleDto> Roles { get; set; } = Array.Empty<AppRoleDto>();
        /// <summary>Effective permissions via <c>RolePermissions</c> → <c>Permissions</c>.</summary>
        public IReadOnlyList<PermissionDto> Permissions { get; set; } = Array.Empty<PermissionDto>();
    }

    public class RegisterDto
    {
        /// <summary>Deprecated; use <see cref="Email"/>.</summary>
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        /// <summary>Legacy field; not persisted on <c>AuthUsers</c>.</summary>
        /// <remarks>Deprecated — assign application roles via <c>UserRoles</c> after the user profile exists.</remarks>
        [Obsolete("Registration does not persist role on AuthUsers; omit this field. Use UserRoles for RBAC. Will be removed in a future version.")]
        public Role Role { get; set; }
    }
}

