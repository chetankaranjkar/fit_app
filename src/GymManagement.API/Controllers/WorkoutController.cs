using GymManagement.API.Middleware;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class WorkoutController : ControllerBase
{
    private readonly IGymQrFloorWorkoutService _floor;

    public WorkoutController(IGymQrFloorWorkoutService floor)
    {
        _floor = floor;
    }

    [HttpPost("log")]
    [ProducesResponseType(typeof(GymQrWorkoutLogResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<GymQrWorkoutLogResponseDto>> Log(
        [FromBody] GymQrWorkoutLogRequestDto dto,
        CancellationToken cancellationToken)
    {
        var userId = GetProfileUserId();
        if (!userId.HasValue) return Unauthorized();
        try
        {
            var res = await _floor.AddLogAsync(userId.Value, dto, cancellationToken).ConfigureAwait(false);
            return Ok(res);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("end")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> End([FromBody] GymQrWorkoutEndRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = GetProfileUserId();
        if (!userId.HasValue) return Unauthorized();
        var ok = await _floor.EndSessionAsync(userId.Value, dto.SessionId, cancellationToken).ConfigureAwait(false);
        return ok ? NoContent() : NotFound();
    }

    private int? GetProfileUserId()
    {
        var v = HttpContext.Items[JwtUserContextMiddleware.ProfileUserIdKey]?.ToString();
        if (!string.IsNullOrEmpty(v) && int.TryParse(v, out var id)) return id;
        return null;
    }
}
