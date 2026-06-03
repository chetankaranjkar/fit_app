using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    /// <summary>Application role catalog and CRUD — <see cref="PermissionCodes.Config"/> or <c>ADMIN</c> role.</summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public class RolesController : ControllerBase
    {
        private readonly IRolePermissionService _rolePermissionService;
        private readonly IUserService _userService;
        private readonly IRbacService _rbacService;

        public RolesController(
            IRolePermissionService rolePermissionService,
            IUserService userService,
            IRbacService rbacService)
        {
            _rolePermissionService = rolePermissionService;
            _userService = userService;
            _rbacService = rbacService;
        }

        [HttpGet("permissions")]
        public async Task<ActionResult<IEnumerable<PermissionDto>>> GetAllPermissions()
        {
            var list = await _rolePermissionService.GetAllPermissionsAsync();
            return Ok(list);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppRoleDto>>> GetAllRoles()
        {
            var list = await _rolePermissionService.GetAllRolesAsync();
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AppRoleDto>> GetRole(int id)
        {
            var role = await _rolePermissionService.GetRoleByIdAsync(id);
            if (role == null) return NotFound();
            return Ok(role);
        }

        [HttpPost]
        public async Task<ActionResult<AppRoleDto>> CreateRole(CreateAppRoleDto dto)
        {
            var role = await _rolePermissionService.CreateRoleAsync(dto);
            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, role);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<AppRoleDto>> UpdateRole(int id, UpdateAppRoleDto dto)
        {
            var role = await _rolePermissionService.UpdateRoleAsync(id, dto);
            if (role == null) return NotFound();
            return Ok(role);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var deleted = await _rolePermissionService.DeleteRoleAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        /// <summary>Paged users with assigned application roles (User roles tab).</summary>
        [HttpGet("user-assignments")]
        public async Task<ActionResult<PagedResultDto<UserRoleAssignmentDto>>> GetUserAssignments(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] string? search = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 100);
            var paged = await _userService.GetUsersPagedAsync(safePage, safePageSize, search, membersOnly: false);
            var userIds = paged.Items.Select(u => u.Id).ToList();
            var rolesByUser = await _rbacService.GetUserAppRolesByUserIdsAsync(userIds);

            var items = paged.Items.Select(u => new UserRoleAssignmentDto
            {
                UserId = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Username = u.Username,
                IsActive = u.IsActive,
                AppRoles = rolesByUser.TryGetValue(u.Id, out var roles)
                    ? roles.ToList()
                    : new List<AppRoleDto>(),
            }).ToList();

            return Ok(new PagedResultDto<UserRoleAssignmentDto>
            {
                Items = items,
                TotalCount = paged.TotalCount,
                Page = paged.Page,
                PageSize = paged.PageSize,
            });
        }

        [HttpGet("users/{userId:int}/app-roles")]
        public async Task<ActionResult<IReadOnlyList<AppRoleDto>>> GetUserAppRoles(int userId)
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound();
            var roles = await _rbacService.GetUserAppRolesAsync(userId);
            return Ok(roles);
        }

        [HttpPost("users/{userId:int}/roles")]
        public async Task<IActionResult> AssignUserRole(int userId, [FromBody] AssignRoleRequest request)
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound();
            try
            {
                await _userService.AssignRoleAsync(userId, request.RoleCode);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("users/{userId:int}/roles/{roleCode}")]
        public async Task<IActionResult> RevokeUserRole(int userId, string roleCode)
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound();
            try
            {
                await _userService.RevokeRoleAsync(userId, roleCode);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
