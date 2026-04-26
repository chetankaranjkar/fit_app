using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class RolePermissionService : IRolePermissionService
    {
        private readonly IUnitOfWork _unitOfWork;

        public RolePermissionService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<PermissionDto>> GetAllPermissionsAsync()
        {
            var list = await _unitOfWork.Permissions.GetAllAsync();
            return list.Select(p => new PermissionDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Description = p.Description
            });
        }

        public async Task<IEnumerable<AppRoleDto>> GetAllRolesAsync()
        {
            var roles = (await _unitOfWork.AppRoles.GetAllAsync()).ToList();
            var roleIds = roles.Select(r => r.Id).ToHashSet();
            var rolePerms = (await _unitOfWork.RolePermissions.GetAllAsync())
                .Where(rp => roleIds.Contains(rp.RoleId))
                .ToList();
            var permIdsByRole = rolePerms.GroupBy(rp => rp.RoleId).ToDictionary(g => g.Key, g => g.Select(rp => rp.PermissionId).ToList());
            return roles.Select(r => new AppRoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                IsActive = r.IsActive,
                PermissionIds = permIdsByRole.GetValueOrDefault(r.Id, new List<int>())
            });
        }

        public async Task<AppRoleDto?> GetRoleByIdAsync(int id)
        {
            var role = await _unitOfWork.AppRoles.GetByIdAsync(id);
            if (role == null) return null;
            var rolePerms = (await _unitOfWork.RolePermissions.GetAllAsync()).Where(rp => rp.RoleId == id).ToList();
            return new AppRoleDto
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                IsActive = role.IsActive,
                PermissionIds = rolePerms.Select(rp => rp.PermissionId).ToList()
            };
        }

        public async Task<AppRoleDto> CreateRoleAsync(CreateAppRoleDto dto)
        {
            var existing = (await _unitOfWork.AppRoles.GetAllAsync()).FirstOrDefault(r => r.Name.Trim().ToLower() == dto.Name.Trim().ToLower());
            if (existing != null)
                throw new ConflictException("A role with this name already exists.");
            var role = new AppRole
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                IsActive = dto.IsActive
            };
            await _unitOfWork.AppRoles.AddAsync(role);
            await _unitOfWork.SaveChangesAsync();
            await SetRolePermissionsAsync(role.Id, dto.PermissionIds ?? new List<int>());
            await _unitOfWork.SaveChangesAsync();
            return (await GetRoleByIdAsync(role.Id))!;
        }

        public async Task<AppRoleDto?> UpdateRoleAsync(int id, UpdateAppRoleDto dto)
        {
            var role = await _unitOfWork.AppRoles.GetByIdAsync(id);
            if (role == null) return null;
            if (dto.Name != null)
            {
                var existing = (await _unitOfWork.AppRoles.GetAllAsync()).FirstOrDefault(r => r.Id != id && r.Name.Trim().ToLower() == dto.Name.Trim().ToLower());
                if (existing != null)
                    throw new ConflictException("A role with this name already exists.");
                role.Name = dto.Name.Trim();
            }
            if (dto.Description != null) role.Description = dto.Description.Trim();
            if (dto.IsActive.HasValue) role.IsActive = dto.IsActive.Value;
            _unitOfWork.AppRoles.Update(role);
            if (dto.PermissionIds != null)
            {
                await SetRolePermissionsAsync(id, dto.PermissionIds);
            }
            await _unitOfWork.SaveChangesAsync();
            return await GetRoleByIdAsync(id);
        }

        public async Task<bool> DeleteRoleAsync(int id)
        {
            var role = await _unitOfWork.AppRoles.GetByIdAsync(id);
            if (role == null) return false;
            _unitOfWork.AppRoles.Delete(role);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private async Task SetRolePermissionsAsync(int roleId, List<int> permissionIds)
        {
            var existing = (await _unitOfWork.RolePermissions.GetAllAsync()).Where(rp => rp.RoleId == roleId).ToList();
            foreach (var rp in existing)
            {
                _unitOfWork.RolePermissions.Delete(rp);
            }
            var validIds = (await _unitOfWork.Permissions.GetAllAsync()).Select(p => p.Id).ToHashSet();
            foreach (var pid in permissionIds.Distinct())
            {
                if (!validIds.Contains(pid)) continue;
                await _unitOfWork.RolePermissions.AddAsync(new RolePermission { RoleId = roleId, PermissionId = pid });
            }
        }
    }
}
