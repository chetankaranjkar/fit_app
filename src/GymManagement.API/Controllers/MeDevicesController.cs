using GymManagement.API.Attributes;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public sealed class MeDevicesController : ControllerBase
{
    private readonly IDeviceSessionService _deviceSessions;
    private readonly IAuthService _authService;

    public MeDevicesController(IDeviceSessionService deviceSessions, IAuthService authService)
    {
        _deviceSessions = deviceSessions;
        _authService = authService;
    }

    [HttpGet("devices")]
    [ProducesResponseType(typeof(IReadOnlyList<UserDeviceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserDeviceDto>>> GetDevices(
        [FromQuery] string? currentDeviceUniqueId,
        CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (userId == null) return Unauthorized();

        var devices = await _deviceSessions.GetUserDevicesAsync(userId.Value, currentDeviceUniqueId, cancellationToken);
        return Ok(devices);
    }

    [HttpDelete("devices/{deviceId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveDevice(int deviceId, CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (userId == null) return Unauthorized();

        var ok = await _deviceSessions.RemoveDeviceAsync(userId.Value, deviceId, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("devices/logout-all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> LogoutAllDevices(CancellationToken cancellationToken)
    {
        _ = cancellationToken;
        var ok = await _authService.LogoutAllDevicesAsync();
        if (!ok) return BadRequest(new { message = "Could not sign out all devices." });
        return Ok(new { message = "Signed out from all devices." });
    }

    [HttpGet("login-history")]
    [ProducesResponseType(typeof(IReadOnlyList<LoginHistoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LoginHistoryDto>>> GetLoginHistory(
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var userId = ResolveUserId();
        if (userId == null) return Unauthorized();

        var history = await _deviceSessions.GetLoginHistoryAsync(userId.Value, take, cancellationToken);
        return Ok(history);
    }

    private int? ResolveUserId()
    {
        var raw = User.FindFirst(JwtClaimTypes.UserId)?.Value ?? User.FindFirst("userId")?.Value;
        return int.TryParse(raw, out var id) ? id : null;
    }
}
