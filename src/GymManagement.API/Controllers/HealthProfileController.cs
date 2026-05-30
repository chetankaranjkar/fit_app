using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.Health;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HealthProfileController : ControllerBase
    {
        private readonly IHealthProfileService _healthProfileService;

        public HealthProfileController(IHealthProfileService healthProfileService)
        {
            _healthProfileService = healthProfileService;
        }

        /// <summary>Current user's health profile (member self-service).</summary>
        [HttpGet("me")]
        public async Task<ActionResult<HealthProfileDto>> GetMyProfile(CancellationToken cancellationToken)
        {
            var userId = HttpContext.GetJwtProfileUserId();
            if (userId == null) return Unauthorized();

            var profile = await _healthProfileService.GetByUserIdAsync(userId.Value, cancellationToken);
            if (profile == null) return NotFound();
            return Ok(profile);
        }

        /// <summary>Upsert current user's health profile.</summary>
        [HttpPut("me")]
        public async Task<ActionResult<HealthProfileDto>> UpsertMyProfile(
            [FromBody] UpsertHealthProfileDto dto,
            CancellationToken cancellationToken)
        {
            var userId = HttpContext.GetJwtProfileUserId();
            if (userId == null) return Unauthorized();

            var profile = await _healthProfileService.UpsertAsync(userId.Value, dto, cancellationToken);
            return Ok(profile);
        }

        /// <summary>Full health profile for a member (staff, assigned trainer, or self).</summary>
        [HttpGet("user/{userId:int}")]
        public async Task<ActionResult<HealthProfileDto>> GetByUser(int userId, CancellationToken cancellationToken)
        {
            if (!await AuthorizeAccessAsync(userId, cancellationToken))
                return Forbid();

            var profile = await _healthProfileService.GetByUserIdAsync(userId, cancellationToken);
            if (profile == null) return NotFound();
            return Ok(profile);
        }

        /// <summary>Trainer-focused summary — conditions, injuries, restrictions, risk.</summary>
        [HttpGet("user/{userId:int}/summary")]
        public async Task<ActionResult<HealthProfileSummaryDto>> GetSummaryByUser(int userId, CancellationToken cancellationToken)
        {
            if (!await AuthorizeAccessAsync(userId, cancellationToken))
                return Forbid();

            var summary = await _healthProfileService.GetSummaryByUserIdAsync(userId, cancellationToken);
            if (summary == null) return NotFound();
            return Ok(summary);
        }

        /// <summary>Create or replace a member health profile.</summary>
        [HttpPut("user/{userId:int}")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<HealthProfileDto>> UpsertForUser(
            int userId,
            [FromBody] UpsertHealthProfileDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                var profile = await _healthProfileService.UpsertAsync(userId, dto, cancellationToken);
                return Ok(profile);
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        private async Task<bool> AuthorizeAccessAsync(int targetUserId, CancellationToken cancellationToken)
        {
            var requestingUserId = HttpContext.GetJwtProfileUserId();
            if (requestingUserId == null) return false;

            var hasUsersAccess = User.HasClaim("permission", PermissionCodes.UsersAccess) ||
                                 User.HasClaim("permission", PermissionCodes.MANAGE_MEMBERS);
            var hasTrainerAccess = User.HasClaim("permission", PermissionCodes.TrainerAccess);

            return await _healthProfileService.CanAccessUserHealthProfileAsync(
                requestingUserId.Value,
                targetUserId,
                hasUsersAccess,
                hasTrainerAccess,
                cancellationToken);
        }
    }
}
