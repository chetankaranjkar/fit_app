using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Core.Validation;
using GymManagement.Infrastructure.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IMobileNumberAvailabilityService _mobileAvailability;
        private readonly IUsernameAvailabilityService _usernameAvailability;
        private readonly IRbacService _rbacService;
        private readonly WebRootImageStorage _imageStorage;

        public UsersController(
            IUserService userService,
            IMobileNumberAvailabilityService mobileAvailability,
            IUsernameAvailabilityService usernameAvailability,
            IRbacService rbacService,
            WebRootImageStorage imageStorage)
        {
            _userService = userService;
            _mobileAvailability = mobileAvailability;
            _usernameAvailability = usernameAvailability;
            _rbacService = rbacService;
            _imageStorage = imageStorage;
        }

        /// <summary>Real-time check: is this Indian mobile available globally (Option A — includes soft-deleted users).</summary>
        [HttpGet("check-mobile")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<MobileNumberAvailabilityDto>> CheckMobileAvailability(
            [FromQuery] string? mobile,
            [FromQuery] int? excludeUserId = null)
        {
            var result = await _mobileAvailability.CheckAsync(mobile, excludeUserId);
            return Ok(result);
        }

        /// <summary>Real-time check: is this login username available (<c>AuthUsers.Email</c>).</summary>
        [HttpGet("check-username")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<UsernameAvailabilityDto>> CheckUsernameAvailability(
            [FromQuery] string? username,
            [FromQuery] int? excludeUserId = null)
        {
            var result = await _usernameAvailability.CheckAsync(username, excludeUserId);
            return Ok(result);
        }

        [HttpGet]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("paged")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<PagedResultDto<UserDto>>> GetPagedUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null,
            [FromQuery] bool membersOnly = false,
            [FromQuery] bool? isActive = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 200);
            var result = await _userService.GetUsersPagedAsync(
                safePage,
                safePageSize,
                search,
                membersOnly,
                isActive);
            return Ok(result);
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
            if (string.IsNullOrWhiteSpace(createUserDto.Username)
                || string.IsNullOrWhiteSpace(createUserDto.Password))
            {
                return BadRequest(new
                {
                    message = "Username and password are required for portal and mobile login.",
                });
            }

            try
            {
                var user = await _userService.CreateUserAsync(createUserDto);
                return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
            }
            catch (ActiveMembershipConflictException ex)
            {
                return Conflict(new
                {
                    message = ex.Details.Message,
                    code = ActiveMembershipConflictDto.ErrorCode,
                    activeMembership = ex.Details,
                });
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsDuplicatePhoneException(ex))
            {
                return Conflict(new { message = "A user with this phone number already exists." });
            }
            catch (DbUpdateException ex) when (IsDuplicateAuthEmailException(ex))
            {
                return Conflict(new { message = UsernameAvailabilityService.DuplicateUsernameMessage });
            }
            catch (DbUpdateException ex) when (IsDuplicateActiveMembershipIndex(ex))
            {
                return Conflict(new { message = UserMembershipConflictCodes.Message });
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
            catch (ActiveMembershipConflictException ex)
            {
                return Conflict(new
                {
                    message = ex.Details.Message,
                    code = ActiveMembershipConflictDto.ErrorCode,
                    activeMembership = ex.Details,
                });
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
                return Conflict(new { message = PhoneNumberValidator.DuplicatePhoneMessage });
            }
            catch (DbUpdateException ex) when (IsDuplicateAuthEmailException(ex))
            {
                return Conflict(new { message = UsernameAvailabilityService.DuplicateUsernameMessage });
            }
            catch (DbUpdateException ex) when (IsDuplicateActiveMembershipIndex(ex))
            {
                return Conflict(new { message = UserMembershipConflictCodes.Message });
            }
        }

        private static bool IsDuplicatePhoneException(DbUpdateException ex)
        {
            var inner = ex.InnerException;
            while (inner != null)
            {
                if (inner is SqlException sqlEx)
                {
                    var msg = sqlEx.Message;
                    if (msg.Contains("UQ_Users_MobileNumber", StringComparison.OrdinalIgnoreCase)
                        || msg.Contains("IX_Users_MobileNumber", StringComparison.OrdinalIgnoreCase)
                        || msg.Contains("IX_Users_Phone", StringComparison.OrdinalIgnoreCase))
                        return true;
                }
                inner = inner.InnerException;
            }
            return false;
        }

        private static bool IsDuplicateAuthEmailException(DbUpdateException ex)
        {
            for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
            {
                if (inner is SqlException sqlEx
                    && (sqlEx.Message.Contains("AuthUsers", StringComparison.OrdinalIgnoreCase)
                        || sqlEx.Message.Contains("Email", StringComparison.OrdinalIgnoreCase))
                    && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
                    return true;
            }

            return false;
        }

        private static bool IsDuplicateActiveMembershipIndex(DbUpdateException ex)
        {
            for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
            {
                if (inner.Message.Contains("IX_user_memberships_one_active_per_user", StringComparison.OrdinalIgnoreCase))
                    return true;
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

