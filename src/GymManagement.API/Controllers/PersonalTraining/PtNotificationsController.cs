using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/notifications")]
    [Authorize]
    [HasPermission(PermissionCodes.BookPtSessions)]
    public class PtNotificationsController : ControllerBase
    {
        private readonly IPtNotificationService _service;

        public PtNotificationsController(IPtNotificationService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult> List([FromQuery] int? userId, [FromQuery] int? trainerId, [FromQuery] bool unreadOnly = false, CancellationToken ct = default)
            => Ok(await _service.GetForUserAsync(userId, trainerId, unreadOnly, ct));

        [HttpPost("{id:int}/read")]
        public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
        {
            await _service.MarkReadAsync(id, ct);
            return NoContent();
        }
    }
}
