using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    /// <summary>Caller's own coach workspace; never accepts a trainer id from the client.</summary>
    [ApiController]
    [Route("api/trainers/me")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class TrainerMeController : ControllerBase
    {
        private const int MaxUtcOffsetMinutes = 14 * 60;

        private readonly ITrainerTodayService _todayService;
        private readonly ApplicationDbContext _db;

        public TrainerMeController(ITrainerTodayService todayService, ApplicationDbContext db)
        {
            _todayService = todayService;
            _db = db;
        }

        [HttpGet("today")]
        public async Task<ActionResult<TrainerTodayDto>> GetToday(
            [FromQuery] int utcOffsetMinutes = 0,
            [FromQuery] int missedLookbackDays = 7,
            CancellationToken cancellationToken = default)
        {
            var trainerId = await UserDirectoryScope.ResolveTrainerProfileIdAsync(HttpContext, _db, cancellationToken);
            if (!trainerId.HasValue)
                return NotFound(new { message = "No trainer profile is linked to your account." });

            var offset = Math.Clamp(utcOffsetMinutes, -MaxUtcOffsetMinutes, MaxUtcOffsetMinutes);
            var result = await _todayService.GetTodayAsync(
                trainerId.Value,
                offset,
                missedLookbackDays,
                DateTime.UtcNow,
                cancellationToken);
            return result == null
                ? NotFound(new { message = "No trainer profile is linked to your account." })
                : Ok(result);
        }
    }
}
