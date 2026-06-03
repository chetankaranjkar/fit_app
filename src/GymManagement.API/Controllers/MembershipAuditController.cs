using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/membership-audit")]
    [Authorize]
    public class MembershipAuditController : ControllerBase
    {
        private readonly IMembershipAuditService _service;

        public MembershipAuditController(IMembershipAuditService service) => _service = service;

        [HttpGet]
        [HasPermissionOrAdmin(PermissionCodes.ViewMembershipAudit)]
        public async Task<IActionResult> List(
            [FromQuery] int? membershipId,
            [FromQuery] int? userId,
            CancellationToken ct) =>
            Ok(await _service.ListAsync(membershipId, userId, ct));
    }
}
