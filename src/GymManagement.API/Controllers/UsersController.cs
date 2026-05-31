using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using GymManagement.API.Attributes;
using GymManagement.API.Services;
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
        private readonly WebRootImageStorage _imageStorage;

        public UsersController(
            IUserService userService,
            IRbacService rbacService,
            WebRootImageStorage imageStorage)
        {
            _userService = userService;
            _rbacService = rbacService;
            _imageStorage = imageStorage;
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

        /// <summary>User identity + RBAC roles + member/trainer/staff profiles.</summary>
        [HttpGet("{id}/aggregate")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<UserAggregateDto>> GetUserAggregate(int id)
        {
            var aggregate = await _userService.GetUserAggregateAsync(id);
            if (aggregate == null)
                return NotFound();
            return Ok(aggregate);
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
                UserDto? before = null;
                if (updateUserDto.ProfilePictureUrl != null)
                    before = await _userService.GetUserByIdAsync(id);

                var user = await _userService.UpdateUserAsync(id, updateUserDto);
                if (user == null)
                    return NotFound();

                if (before != null
                    && updateUserDto.ProfilePictureUrl != null
                    && !string.Equals(before.ProfilePictureUrl, user.ProfilePictureUrl, StringComparison.OrdinalIgnoreCase))
                {
                    _imageStorage.TryDeleteManagedImage(before.ProfilePictureUrl);
                }

                return Ok(user);
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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

        [HttpPost("{id}/roles")]
        [HasPermission(PermissionCodes.MANAGE_MEMBERS)]
        public async Task<IActionResult> AssignRole(int id, [FromBody] AssignRoleRequest request)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            try
            {
                await _userService.AssignRoleAsync(id, request.RoleCode);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}/roles/{roleCode}")]
        [HasPermission(PermissionCodes.MANAGE_MEMBERS)]
        public async Task<IActionResult> RevokeRole(int id, string roleCode)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            try
            {
                await _userService.RevokeRoleAsync(id, roleCode);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

