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
    [Route("api/membership-payments")]
    [Authorize]
    public class MembershipPaymentsController : ControllerBase
    {
        private readonly IMembershipPaymentService _service;

        public MembershipPaymentsController(IMembershipPaymentService service)
        {
            _service = service;
        }

        [HttpGet("dashboard-summary")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDashboardDto>> Dashboard(CancellationToken ct) =>
            Ok(await _service.GetDashboardSummaryAsync(ct));

        [HttpGet("by-membership/{membershipId:int}")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDto>> ByMembership(int membershipId, CancellationToken ct)
        {
            var dto = await _service.GetByMembershipIdAsync(membershipId, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpGet("by-user/{userId:int}")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<IReadOnlyList<MembershipPaymentDto>>> ByUser(int userId, CancellationToken ct) =>
            Ok(await _service.GetByUserIdAsync(userId, ct));

        [HttpPost("{id:int}/apply-coupon")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDto>> ApplyCoupon(
            int id,
            [FromBody] ApplyCouponToPaymentDto dto,
            CancellationToken ct) =>
            Ok(await _service.ApplyCouponAsync(id, dto, ct));

        [HttpPost("{id:int}/remove-coupon")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDto>> RemoveCoupon(int id, CancellationToken ct) =>
            Ok(await _service.RemoveCouponAsync(id, ct));

        [HttpPost("{id:int}/installments")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDto>> AddInstallment(
            int id,
            [FromBody] RecordMembershipPaymentInstallmentDto dto,
            CancellationToken ct)
        {
            var staffUserId = ResolveStaffUserId();
            var result = await _service.RecordInstallmentAsync(id, dto, staffUserId, ct);
            return Ok(result);
        }

        [HttpPost("{id:int}/reminder-sent")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<IActionResult> MarkReminder(int id, CancellationToken ct)
        {
            await _service.MarkReminderSentAsync(id, ct);
            return NoContent();
        }

        [HttpGet("{id:int}/invoice-pdf")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<IActionResult> InvoicePdf(int id, CancellationToken ct)
        {
            var bytes = await _service.GetInvoicePdfForMembershipPaymentAsync(id, ct);
            if (bytes == null || bytes.Length == 0)
                return NotFound();
            return File(bytes, "application/pdf", $"membership-invoice-{id}.pdf");
        }

        private int? ResolveStaffUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
