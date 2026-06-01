using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/waive-off-requests")]
    [Authorize]
    public class WaiveOffRequestsController : ControllerBase
    {
        private readonly IWaiveOffRequestService _service;

        public WaiveOffRequestsController(IWaiveOffRequestService service) => _service = service;

        [HttpGet]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<IReadOnlyList<WaiveOffRequestDto>>> List(
            [FromQuery] WaiveOffRequestStatusFilter? status,
            CancellationToken ct) =>
            Ok(await _service.ListAsync(status, ct));

        [HttpGet("{id:int}")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<WaiveOffRequestDto>> Get(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<WaiveOffRequestDto>> Create(
            [FromBody] CreateWaiveOffRequestDto dto,
            CancellationToken ct)
        {
            var userId = ResolveUserId();
            if (!userId.HasValue) return Unauthorized();
            return Ok(await _service.CreateAsync(dto, userId.Value, ct));
        }

        [HttpPost("{id:int}/approve")]
        [HasPermission(PermissionCodes.ApproveWaiveOff)]
        public async Task<ActionResult<WaiveOffRequestDto>> Approve(int id, CancellationToken ct)
        {
            var userId = ResolveUserId();
            if (!userId.HasValue) return Unauthorized();
            return Ok(await _service.ApproveAsync(id, userId.Value, ct));
        }

        [HttpPost("{id:int}/reject")]
        [HasPermission(PermissionCodes.ApproveWaiveOff)]
        public async Task<ActionResult<WaiveOffRequestDto>> Reject(
            int id,
            [FromBody] RejectWaiveOffRequestDto dto,
            CancellationToken ct)
        {
            var userId = ResolveUserId();
            if (!userId.HasValue) return Unauthorized();
            return Ok(await _service.RejectAsync(id, userId.Value, dto, ct));
        }

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
