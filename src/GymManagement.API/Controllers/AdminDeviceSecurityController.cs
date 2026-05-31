using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/admin/device-security")]
[Authorize]
[HasPermission(PermissionCodes.Reports)]
public sealed class AdminDeviceSecurityController : ControllerBase
{
    private readonly IDeviceSessionService _deviceSessions;

    public AdminDeviceSecurityController(IDeviceSessionService deviceSessions)
    {
        _deviceSessions = deviceSessions;
    }

    [HttpGet("analytics")]
    [ProducesResponseType(typeof(DeviceSecurityAnalyticsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DeviceSecurityAnalyticsDto>> GetAnalytics(
        [FromQuery] AdminDeviceFilterDto filter,
        CancellationToken cancellationToken)
    {
        var analytics = await _deviceSessions.GetAdminAnalyticsAsync(filter, cancellationToken);
        return Ok(analytics);
    }
}
