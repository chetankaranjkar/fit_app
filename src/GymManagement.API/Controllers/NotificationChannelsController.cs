using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/notification-channels")]
[Authorize]
[HasPermissionOrAdmin(PermissionCodes.Config)]
public class NotificationChannelsController : ControllerBase
{
    private readonly INotificationChannelStatusService _status;

    public NotificationChannelsController(INotificationChannelStatusService status) => _status = status;

    [HttpGet]
    public async Task<ActionResult<NotificationChannelsOverviewDto>> Get(CancellationToken ct) =>
        Ok(await _status.GetOverviewAsync(ct));
}
