using GymManagement.API.Middleware;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AttendanceController : ControllerBase
{
    private readonly IAttendanceScanOrchestrator _orchestrator;

    public AttendanceController(IAttendanceScanOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    /// <summary>QR check-in with Redis replay + rate limit and gym-floor workout session.</summary>
    [HttpPost("scan")]
    [ProducesResponseType(typeof(AttendanceScanResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AttendanceScanResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(AttendanceScanResponseDto), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(AttendanceScanResponseDto), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AttendanceScanResponseDto>> Scan(
        [FromBody] AttendanceScanRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = GetProfileUserId();
        if (!userId.HasValue) return Unauthorized();

        var result = await _orchestrator.ScanAsync(request, userId.Value, cancellationToken).ConfigureAwait(false);

        if (result.ErrorCode == "rate_limited")
            return StatusCode(StatusCodes.Status429TooManyRequests, result);
        if (result.ErrorCode == "replay")
            return Conflict(result);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    private int? GetProfileUserId()
    {
        var v = HttpContext.Items[JwtUserContextMiddleware.ProfileUserIdKey]?.ToString();
        if (!string.IsNullOrEmpty(v) && int.TryParse(v, out var id)) return id;
        return null;
    }
}
