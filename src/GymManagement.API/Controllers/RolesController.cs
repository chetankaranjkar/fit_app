using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
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

        public RolesController(IRolePermissionService rolePermissionService)
        {
            _rolePermissionService = rolePermissionService;
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
    }
}
