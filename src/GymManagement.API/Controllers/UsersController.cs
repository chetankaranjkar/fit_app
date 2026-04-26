using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IRbacService _rbacService;

        public UsersController(IUserService userService, IRbacService rbacService)
        {
            _userService = userService;
            _rbacService = rbacService;
        }

        [HttpGet]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<UserDto>> GetUser(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            return Ok(user);
        }

        [HttpPost]
        [HasPermission(PermissionCodes.CREATE_MEMBER)]
        public async Task<ActionResult<UserDto>> CreateUser(CreateUserDto createUserDto)
        {
            try
            {
                var user = await _userService.CreateUserAsync(createUserDto);
                return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsDuplicatePhoneException(ex))
            {
                return Conflict(new { message = "A user with this phone number already exists." });
            }
        }

        [HttpPut("{id}")]
        [HasPermission(PermissionCodes.MANAGE_MEMBERS)]
        public async Task<ActionResult<UserDto>> UpdateUser(int id, UpdateUserDto updateUserDto)
        {
            try
            {
                var user = await _userService.UpdateUserAsync(id, updateUserDto);
                if (user == null)
                    return NotFound();
                return Ok(user);
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsDuplicatePhoneException(ex))
            {
                return Conflict(new { message = "A user with this phone number already exists." });
            }
        }

        private static bool IsDuplicatePhoneException(DbUpdateException ex)
        {
            var inner = ex.InnerException;
            while (inner != null)
            {
                if (inner is SqlException sqlEx && sqlEx.Message.Contains("IX_Users_Phone", StringComparison.OrdinalIgnoreCase))
                    return true;
                inner = inner.InnerException;
            }
            return false;
        }

        [HttpDelete("{id}")]
        [HasPermission(PermissionCodes.MANAGE_MEMBERS)]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var result = await _userService.DeleteUserAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }

        /// <summary>Effective permissions via UserRoles → RolePermissions → Permissions.</summary>
        [HttpGet("{id}/permissions")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IReadOnlyList<PermissionDto>>> GetUserPermissions(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            var permissions = await _rbacService.GetUserPermissionsAsync(id);
            return Ok(permissions);
        }

        /// <summary>Application roles (Roles table) assigned through UserRoles.</summary>
        [HttpGet("{id}/app-roles")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IReadOnlyList<AppRoleDto>>> GetUserAppRoles(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            var roles = await _rbacService.GetUserAppRolesAsync(id);
            return Ok(roles);
        }

        [HttpGet("{id}/details")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IEnumerable<UserDetailDto>>> GetUserDetails(int id)
        {
            var details = await _userService.GetUserDetailsAsync(id);
            return Ok(details);
        }

        [HttpPost("details")]
        [HasPermission(PermissionCodes.MANAGE_MEMBERS)]
        public async Task<ActionResult<UserDetailDto>> AddUserDetail(CreateUserDetailDto createUserDetailDto)
        {
            var detail = await _userService.AddUserDetailAsync(createUserDetailDto);
            return CreatedAtAction(nameof(GetUserDetails), new { id = createUserDetailDto.UserId }, detail);
        }
    }
}

