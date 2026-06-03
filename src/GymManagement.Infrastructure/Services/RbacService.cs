using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>
    /// Resolves effective roles and permissions: <c>UserRoles</c> → <c>AppRole</c> → <c>RolePermissions</c> → <see cref="Permission"/>.
    /// </summary>
    public sealed class RbacService : IRbacService
    {
        private readonly ApplicationDbContext _db;

        public RbacService(ApplicationDbContext db)
        {
            _db = db;
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<string>> GetUserPermissionCodesAsync(int userId)
        {
            return await EffectivePermissionsQuery(userId)
                .Select(p => p.Code)
                .Distinct()
                .OrderBy(code => code)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<PermissionDto>> GetUserPermissionsAsync(int userId)
        {
            // Avoid GroupBy+g.First() in a single query — some EF Core / SQL Server translations fail at runtime.
            var distinctIds = await EffectivePermissionsQuery(userId)
                .Select(p => p.Id)
                .Distinct()
                .ToListAsync();

            if (distinctIds.Count == 0)
                return Array.Empty<PermissionDto>();

            return await _db.Permissions
                .AsNoTracking()
                .Where(p => distinctIds.Contains(p.Id))
                .OrderBy(p => p.Code)
                .Select(p => new PermissionDto
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                    Description = p.Description
                })
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<string>> GetAllPermissionCodesAsync()
        {
            return await _db.Permissions
                .AsNoTracking()
                .Select(p => p.Code)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<AppRoleDto>> GetUserAppRolesAsync(int userId)
        {
            var map = await GetUserAppRolesByUserIdsAsync(new[] { userId });
            return map.TryGetValue(userId, out var roles) ? roles : Array.Empty<AppRoleDto>();
        }

        /// <inheritdoc />
        public async Task<IReadOnlyDictionary<int, IReadOnlyList<AppRoleDto>>> GetUserAppRolesByUserIdsAsync(
            IReadOnlyCollection<int> userIds)
        {
            if (userIds.Count == 0)
                return new Dictionary<int, IReadOnlyList<AppRoleDto>>();

            var idSet = userIds.Distinct().ToList();
            var rows = await _db.UserRoles
                .AsNoTracking()
                .Where(ur => idSet.Contains(ur.UserId))
                .Include(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                .ToListAsync();

            return rows
                .GroupBy(ur => ur.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<AppRoleDto>)g
                        .GroupBy(ur => ur.RoleId)
                        .Select(grp => grp.First().Role)
                        .OrderBy(r => r.Name)
                        .Select(MapAppRole)
                        .ToList());
        }

        private static AppRoleDto MapAppRole(AppRole r) =>
            new()
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                IsActive = r.IsActive,
                PermissionIds = r.RolePermissions.Select(rp => rp.PermissionId).Distinct().ToList(),
            };

        /// <summary>
        /// <c>UserRoles</c> → <c>Role.RolePermissions</c> → <see cref="Permission"/> (flattened with EF <c>SelectMany</c>).
        /// </summary>
        private IQueryable<Permission> EffectivePermissionsQuery(int userId) =>
            _db.UserRoles
                .AsNoTracking()
                .Where(ur => ur.UserId == userId)
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission);
    }
}
