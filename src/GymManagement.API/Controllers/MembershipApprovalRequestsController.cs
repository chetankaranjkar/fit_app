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
    [Route("api/membership-requests")]
    [Authorize]
    public class MembershipApprovalRequestsController : ControllerBase
    {
        private readonly IMembershipApprovalRequestService _service;

        public MembershipApprovalRequestsController(IMembershipApprovalRequestService service) =>
            _service = service;

        [HttpGet]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<IReadOnlyList<MembershipApprovalRequestDto>>> List(
            [FromQuery] MembershipApprovalRequestStatusFilter? status,
            [FromQuery] string? search,
            CancellationToken ct) =>
            Ok(await _service.ListAsync(status, search, ct));

        [HttpGet("{id:int}")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipApprovalRequestDto>> Get(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipApprovalRequestDto>> Create(
            [FromBody] CreateMembershipApprovalRequestDto dto,
            CancellationToken ct)
        {
            var userId = ResolveUserId();
            if (!userId.HasValue) return Unauthorized();
            return Ok(await _service.CreateAsync(dto, userId.Value, ct));
        }

        [HttpPost("{id:int}/approve")]
        [HasPermissionOrAdmin(PermissionCodes.ApproveMembershipRequest)]
        public async Task<ActionResult<MembershipApprovalRequestDto>> Approve(
            int id,
            [FromBody] ApproveMembershipApprovalRequestDto dto,
            CancellationToken ct)
        {
            var userId = ResolveUserId();
            if (!userId.HasValue) return Unauthorized();
            return Ok(await _service.ApproveAsync(id, userId.Value, dto, ct));
        }

        [HttpPost("{id:int}/reject")]
        [HasPermissionOrAdmin(PermissionCodes.ApproveMembershipRequest)]
        public async Task<ActionResult<MembershipApprovalRequestDto>> Reject(
            int id,
            [FromBody] RejectMembershipApprovalRequestDto dto,
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
