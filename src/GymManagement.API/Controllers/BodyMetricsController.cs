using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.API.Extensions;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.UsersAccess)]
    public class BodyMetricsController : ControllerBase
    {
        private readonly IBodyMetricsService _bodyMetricsService;

        public BodyMetricsController(IBodyMetricsService bodyMetricsService)
        {
            _bodyMetricsService = bodyMetricsService;
        }

        /// <summary>Get body metrics history for a user. Latest snapshot is in UserDetails (GET /api/Users/{id}/details).</summary>
        [HttpGet("user/{userId}/logs")]
        public async Task<ActionResult<IEnumerable<BodyMetricsLogDto>>> GetBodyMetricsLogsByUser(int userId)
        {
            var logs = await _bodyMetricsService.GetBodyMetricsLogsByUserIdAsync(userId);
            return Ok(logs);
        }

        [HttpGet("user/{userId}/latest")]
        /// <summary>Get the most recent body metrics reading for a user.</summary>
        /// <remarks>
        /// Snapshot endpoint: returns a single latest log entry ordered by measurement date (then created date).
        /// Use this when UI needs one "latest" record instead of full history.
        /// </remarks>
        [ProducesResponseType(typeof(BodyMetricsLogDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BodyMetricsLogDto>> GetLatestBodyMetricsByUser(int userId)
        {
            var latest = await _bodyMetricsService.GetLatestBodyMetricsByUserIdAsync(userId);
            if (latest == null)
                return NotFound();
            return Ok(latest);
        }

        [HttpGet("user/{userId}/current")]
        /// <summary>Get the current body metrics snapshot for a user.</summary>
        /// <remarks>
        /// Currently equivalent to <c>latest</c> and returns one reading representing the user's current state.
        /// This endpoint exists to keep "current snapshot" semantics explicit for clients.
        /// </remarks>
        [ProducesResponseType(typeof(BodyMetricsLogDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BodyMetricsLogDto>> GetCurrentBodyMetricsByUser(int userId)
        {
            var current = await _bodyMetricsService.GetCurrentBodyMetricsByUserIdAsync(userId);
            if (current == null)
                return NotFound();
            return Ok(current);
        }

        [HttpPost("logs")]
        public async Task<ActionResult<BodyMetricsLogDto>> CreateBodyMetricsLog(CreateBodyMetricsLogDto dto)
        {
            var log = await _bodyMetricsService.CreateBodyMetricsLogAsync(dto);
            return CreatedAtAction(nameof(GetBodyMetricsLogsByUser), new { userId = dto.UserId }, log);
        }

        [HttpPut("logs/{id}")]
        public async Task<ActionResult<BodyMetricsLogDto>> UpdateBodyMetricsLog(int id, UpdateBodyMetricsLogDto dto)
        {
            var changedByUser = HttpContext.GetJwtProfileUserId()?.ToString()
                ?? HttpContext.GetJwtAuthUserId()?.ToString()
                ?? User?.Identity?.Name
                ?? "system";

            var updated = await _bodyMetricsService.UpdateBodyMetricsLogAsync(id, dto, changedByUser);
            if (updated == null)
                return NotFound();
            return Ok(updated);
        }

        [HttpDelete("logs/{id}")]
        public async Task<IActionResult> DeleteBodyMetricsLog(int id)
        {
            var changedByUser = HttpContext.GetJwtProfileUserId()?.ToString()
                ?? HttpContext.GetJwtAuthUserId()?.ToString()
                ?? User?.Identity?.Name
                ?? "system";

            var deleted = await _bodyMetricsService.DeleteBodyMetricsLogAsync(id, changedByUser);
            if (!deleted)
                return NotFound();
            return NoContent();
        }
    }
}
