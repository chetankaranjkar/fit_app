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
using GymManagement.Infrastructure.Data;
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
        private readonly IMemberTrainingScheduleService _trainingScheduleService;
        private readonly IRbacService _rbacService;
        private readonly WebRootImageStorage _imageStorage;
        private readonly ApplicationDbContext _db;

        public UsersController(
            IUserService userService,
            IMobileNumberAvailabilityService mobileAvailability,
            IUsernameAvailabilityService usernameAvailability,
            IMemberTrainingScheduleService trainingScheduleService,
            IRbacService rbacService,
            WebRootImageStorage imageStorage,
            ApplicationDbContext db)
        {
            _userService = userService;
            _mobileAvailability = mobileAvailability;
            _usernameAvailability = usernameAvailability;
            _trainingScheduleService = trainingScheduleService;
            _rbacService = rbacService;
            _imageStorage = imageStorage;
            _db = db;
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

        /// <summary>Preview coach booking conflicts for a member training slot.</summary>
        [HttpPost("training-schedule/validate")]
        [HasAnyPermission(PermissionCodes.UsersAccess, PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<IReadOnlyList<TrainingScheduleConflictDto>>> ValidateTrainingSchedule(
            [FromBody] ValidateMemberTrainingScheduleDto dto,
            CancellationToken cancellationToken)
        {
            if (dto.TrainerId <= 0)
                return BadRequest(new { message = "trainerId is required." });

            var conflicts = await _trainingScheduleService.GetConflictsAsync(dto, cancellationToken);
            return Ok(conflicts);
        }

        [HttpGet]
        [HasAnyPermission(PermissionCodes.UsersAccess, PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers(CancellationToken cancellationToken)
        {
            var assignedTrainerProfileId = await ResolveAssignedTrainerProfileIdAsync(cancellationToken);
            if (assignedTrainerProfileId == CoachScopeMissingTrainerProfile)
                return Ok(Array.Empty<UserDto>());

            var users = await _userService.GetAllUsersAsync(assignedTrainerProfileId);
            return Ok(users);
        }

        [HttpGet("paged")]
        [HasAnyPermission(PermissionCodes.UsersAccess, PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<PagedResultDto<UserDto>>> GetPagedUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null,
            [FromQuery] bool membersOnly = false,
            [FromQuery] bool? isActive = null,
            [FromQuery] bool includeBilling = true,
            [FromQuery] string? preferredGymTime = null,
            CancellationToken cancellationToken = default)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 200);
            var assignedTrainerProfileId = await ResolveAssignedTrainerProfileIdAsync(cancellationToken);
            if (assignedTrainerProfileId == CoachScopeMissingTrainerProfile)
            {
                return Ok(new PagedResultDto<UserDto>
                {
                    Items = Array.Empty<UserDto>(),
                    TotalCount = 0,
                    Page = safePage,
                    PageSize = safePageSize,
                });
            }

            var result = await _userService.GetUsersPagedAsync(
                safePage,
                safePageSize,
                search,
                membersOnly,
                isActive,
                includeBilling,
                preferredGymTime,
                assignedTrainerProfileId);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [HasAnyPermission(PermissionCodes.UsersAccess, PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<UserDto>> GetUser(int id, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, id, cancellationToken))
                return Forbid();

            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();
            return Ok(user);
        }

        /// <summary>User identity + RBAC roles + member/trainer/staff profiles.</summary>
        [HttpGet("{id}/aggregate")]
        [HasAnyPermission(PermissionCodes.UsersAccess, PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<UserAggregateDto>> GetUserAggregate(int id, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, id, cancellationToken))
                return Forbid();

            var aggregate = await _userService.GetUserAggregateAsync(id);
            if (aggregate == null)
                return NotFound();
            return Ok(aggregate);
        }

        /// <summary>Hero stats + onboarding flags for member profile (single lightweight call).</summary>
        [HttpGet("{id}/profile-summary")]
        [HasAnyPermission(PermissionCodes.UsersAccess, PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<UserProfileSummaryDto>> GetUserProfileSummary(int id, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, id, cancellationToken))
                return Forbid();

            var summary = await _userService.GetUserProfileSummaryAsync(id);
            if (summary == null)
                return NotFound();
            return Ok(summary);
        }

        [HttpPost]
        [HasPermission(PermissionCodes.CREATE_MEMBER)]
        public async Task<ActionResult<UserDto>> CreateUser(CreateUserDto createUserDto)
        {
            if (string.IsNullOrWhiteSpace(createUserDto.Email)
                || string.IsNullOrWhiteSpace(createUserDto.Password))
            {
                return BadRequest(new
                {
                    message = "Email and password are required for portal and mobile login.",
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

        /// <summary>Batch member import for CSV uploads (up to 500 rows per request).</summary>
        [HttpPost("bulk-import")]
        [HasPermission(PermissionCodes.CREATE_MEMBER)]
        public async Task<ActionResult<BulkImportMembersResultDto>> BulkImportMembers(BulkImportMembersRequestDto request)
        {
            if (request.Members == null || request.Members.Count == 0)
                return BadRequest(new { message = "At least one member row is required." });

            try
            {
                var result = await _userService.BulkImportMembersAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsDuplicatePhoneException(ex))
            {
                return Conflict(new { message = "A user with this phone number already exists in this batch or database." });
            }
            catch (DbUpdateException ex) when (IsDuplicateAuthEmailException(ex))
            {
                return Conflict(new { message = UsernameAvailabilityService.DuplicateUsernameMessage });
            }
        }

        /// <summary>Update member email/SMS opt-in without re-validating training schedule.</summary>
        [HttpPut("{id:int}/notification-preferences")]
        [HasAnyPermission(PermissionCodes.Payments, PermissionCodes.UsersAccess, PermissionCodes.MANAGE_MEMBERS)]
        public async Task<ActionResult<MeNotificationPreferencesDto>> UpdateNotificationPreferences(
            int id,
            [FromBody] MeUpdateNotificationPreferencesDto? dto,
            CancellationToken cancellationToken)
        {
            if (dto == null)
                return BadRequest(new { message = "Request body is required." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
            if (user == null)
                return NotFound();

            user.ReceiveEmailNotifications = dto.ReceiveEmailNotifications;
            user.ReceiveSmsNotifications = dto.ReceiveSmsNotifications;
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new MeNotificationPreferencesDto
            {
                ReceiveEmailNotifications = user.ReceiveEmailNotifications,
                ReceiveSmsNotifications = user.ReceiveSmsNotifications,
            });
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

        /// <summary>Sentinel: coach scope requested but the actor has no trainer profile row.</summary>
        private const int CoachScopeMissingTrainerProfile = -1;

        private async Task<int?> ResolveAssignedTrainerProfileIdAsync(CancellationToken cancellationToken)
        {
            if (!UserDirectoryScope.ShouldApplyCoachFilter(HttpContext))
                return null;

            var trainerProfileId = await UserDirectoryScope.ResolveTrainerProfileIdAsync(HttpContext, _db, cancellationToken);
            return trainerProfileId ?? CoachScopeMissingTrainerProfile;
        }
    }
}

