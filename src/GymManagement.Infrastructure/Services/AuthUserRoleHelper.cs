using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>
    /// Maps <see cref="AuthUser"/> to JWT/API <see cref="Role"/> using <c>UserRoles</c> → <c>Roles</c> (<see cref="AppRole"/>),
    /// with legacy fallback when no rows exist (pre-migration or unmigrated accounts).
    /// </summary>
    public static class AuthUserRoleHelper
    {
        /// <summary>Lower priority index = higher precedence when multiple <see cref="AppRole"/> rows exist.</summary>
        private static readonly string[] AppRolePrecedence = { "ADMIN", "STAFF", "TRAINER", "MEMBER" };

        public static bool IsDefaultAdmin(AuthUser authUser) =>
            string.Equals(authUser.Email, "admin@gym.com", StringComparison.OrdinalIgnoreCase);

        /// <summary>Maps canonical <c>Roles.Name</c> values to the small JWT <see cref="Role"/> enum.</summary>
        public static Role MapAppRoleNamesToRole(IEnumerable<string> appRoleNames)
        {
            var set = new HashSet<string>(appRoleNames.Select(n => n.Trim().ToUpperInvariant()));
            foreach (var name in AppRolePrecedence)
            {
                if (!set.Contains(name))
                    continue;
                return name switch
                {
                    "ADMIN" => Role.Admin,
                    "STAFF" => Role.User,
                    "TRAINER" => Role.Instructor,
                    "MEMBER" => Role.User,
                    _ => Role.User
                };
            }
            return Role.User;
        }

        /// <summary>Maps API <see cref="Role"/> to a canonical <c>Roles</c> row name for <see cref="UserRole"/>.</summary>
        public static string MapRoleEnumToAppRoleName(Role role) =>
            role switch
            {
                Role.Admin => "ADMIN",
                Role.Instructor => "TRAINER",
                Role.User => "MEMBER",
                _ => "MEMBER"
            };

        /// <summary>Ensures the user has a <see cref="UserRole"/> row for the given application role name (idempotent).</summary>
        public static async Task EnsureUserHasAppRoleAsync(IUnitOfWork unitOfWork, int userId, string appRoleName)
        {
            var trimmed = appRoleName.Trim();
            var roles = await unitOfWork.AppRoles.GetAllAsync();
            var appRole = roles.FirstOrDefault(r => string.Equals(r.Name, trimmed, StringComparison.OrdinalIgnoreCase));
            if (appRole == null)
                return;

            var exists = await unitOfWork.UserRoles.ExistsAsync(ur =>
                ur.UserId == userId && ur.RoleId == appRole.Id);
            if (exists)
                return;

            await unitOfWork.UserRoles.AddAsync(new UserRole
            {
                UserId = userId,
                RoleId = appRole.Id,
                CreatedDate = DateTime.UtcNow
            });
        }

        /// <summary>Profile <see cref="User.Id"/> for RBAC: <see cref="AuthUser.UserId"/>.</summary>
        public static Task<int?> GetProfileUserIdAsync(IUnitOfWork _, AuthUser authUser) =>
            Task.FromResult(authUser.UserId);

        /// <summary>Login / token role: prefers <c>UserRoles</c>; falls back to default admin and <c>UserUserTypes</c>.</summary>
        public static async Task<Role> ResolveRoleAsync(IUnitOfWork unitOfWork, AuthUser authUser)
        {
            var profileUserId = await GetProfileUserIdAsync(unitOfWork, authUser);
            if (profileUserId.HasValue)
            {
                var userRoleRows = (await unitOfWork.UserRoles.FindAsync(ur => ur.UserId == profileUserId.Value)).ToList();
                if (userRoleRows.Count > 0)
                {
                    var roleIds = userRoleRows.Select(ur => ur.RoleId).Distinct().ToHashSet();
                    var appRoles = (await unitOfWork.AppRoles.GetAllAsync()).Where(r => roleIds.Contains(r.Id)).ToList();
                    if (appRoles.Count > 0)
                    {
                        var names = appRoles.Select(r => r.Name).ToList();
                        return MapAppRoleNamesToRole(names);
                    }
                }
            }

            return await ResolveRoleLegacyAsync(unitOfWork, authUser);
        }

        /// <summary>
        /// ADMIN/STAFF role names to add to JWT when <c>UserRoles</c> does not already include either (fixes accounts that only
        /// have MEMBER/TRAINER rows but Staff/Admin user types, or default admin without <c>UserRoles</c> yet).
        /// </summary>
        public static async Task<List<string>> GetQrConsoleJwtRoleSupplementsAsync(
            IUnitOfWork unitOfWork,
            AuthUser authUser)
        {
            var extras = new List<string>();
            if (IsDefaultAdmin(authUser))
                extras.Add("ADMIN");
            if (!authUser.UserId.HasValue)
                return extras.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            // Match in memory — EF Core often cannot translate StringComparison / ToUpper on UserType.Name reliably.
            var userTypesAll = (await unitOfWork.UserTypes.GetAllAsync()).ToList();
            static string? CanonicalUserTypeName(string? name)
            {
                var t = name?.Trim();
                return string.IsNullOrEmpty(t) ? null : t.ToUpperInvariant();
            }

            var adminType = userTypesAll.FirstOrDefault(ut => CanonicalUserTypeName(ut.Name) == "ADMIN");
            if (adminType != null)
            {
                var isOrgAdminType = await unitOfWork.UserUserTypes.ExistsAsync(uut =>
                    uut.UserId == authUser.UserId.Value && uut.UserTypeId == adminType.Id);
                if (isOrgAdminType)
                    extras.Add("ADMIN");
            }

            var staffType = userTypesAll.FirstOrDefault(ut => CanonicalUserTypeName(ut.Name) == "STAFF");
            if (staffType != null)
            {
                var isStaffType = await unitOfWork.UserUserTypes.ExistsAsync(uut =>
                    uut.UserId == authUser.UserId.Value && uut.UserTypeId == staffType.Id);
                if (isStaffType)
                    extras.Add("STAFF");
            }

            return extras.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private static async Task<Role> ResolveRoleLegacyAsync(IUnitOfWork unitOfWork, AuthUser authUser)
        {
            if (IsDefaultAdmin(authUser))
                return Role.Admin;
            if (authUser.UserId.HasValue)
            {
                var userTypesAll = (await unitOfWork.UserTypes.GetAllAsync()).ToList();
                var adminType = userTypesAll.FirstOrDefault(ut =>
                {
                    var t = ut.Name?.Trim();
                    return !string.IsNullOrEmpty(t) && t.ToUpperInvariant() == "ADMIN";
                });
                if (adminType != null)
                {
                    var isStaffAdmin = await unitOfWork.UserUserTypes.ExistsAsync(uut =>
                        uut.UserId == authUser.UserId && uut.UserTypeId == adminType.Id);
                    if (isStaffAdmin)
                        return Role.Admin;
                }
                return Role.User;
            }
            return Role.User;
        }

        /// <summary>Sync resolution for user list/detail DTOs when app role names (from <c>UserRoles</c>) are already loaded.</summary>
        public static Role? ResolveRoleForUserDto(
            AuthUser? authUser,
            bool isInstructorProfile,
            List<UserTypeDto>? userTypes,
            IReadOnlyList<string>? appRoleNamesFromUserRoles = null)
        {
            if (appRoleNamesFromUserRoles != null && appRoleNamesFromUserRoles.Count > 0)
                return MapAppRoleNamesToRole(appRoleNamesFromUserRoles);
            if (isInstructorProfile)
                return Role.Instructor;
            if (authUser == null)
                return null;
            if (IsDefaultAdmin(authUser))
                return Role.Admin;
            if (userTypes?.Any(ut => string.Equals(ut.Name, "Admin", StringComparison.OrdinalIgnoreCase)) == true)
                return Role.Admin;
            return Role.User;
        }
    }
}
