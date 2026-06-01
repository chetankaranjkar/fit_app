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

        [HttpGet("financial-summary/by-membership/{membershipId:int}")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipFinancialSummaryDto>> FinancialSummary(int membershipId, CancellationToken ct)
        {
            var dto = await _service.GetFinancialSummaryByMembershipIdAsync(membershipId, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpGet("{id:int}/check-duplicate")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<DuplicatePaymentCheckDto>> CheckDuplicate(
            int id,
            [FromQuery] decimal amount,
            CancellationToken ct) =>
            Ok(await _service.CheckDuplicatePaymentAsync(id, amount, ct));

        [HttpGet("transactions")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<IReadOnlyList<MembershipPaymentTransactionListDto>>> Transactions(
            [FromQuery] MembershipPaymentTransactionQuery query,
            CancellationToken ct) =>
            Ok(await _service.ListTransactionsAsync(query, ct));

        [HttpPost("transactions/{transactionId:int}/void")]
        [HasPermission(PermissionCodes.VoidPayment)]
        public async Task<ActionResult<MembershipPaymentDto>> VoidTransaction(
            int transactionId,
            [FromBody] VoidPaymentTransactionDto dto,
            CancellationToken ct)
        {
            var staffUserId = ResolveStaffUserId();
            if (!staffUserId.HasValue) return Unauthorized();
            return Ok(await _service.VoidTransactionAsync(transactionId, dto, staffUserId.Value, ct));
        }

        [HttpPost("transactions/{transactionId:int}/refund")]
        [HasPermission(PermissionCodes.RefundPayment)]
        public async Task<ActionResult<MembershipPaymentDto>> RefundTransaction(
            int transactionId,
            [FromBody] RefundPaymentTransactionDto dto,
            CancellationToken ct)
        {
            var staffUserId = ResolveStaffUserId();
            if (!staffUserId.HasValue) return Unauthorized();
            return Ok(await _service.RefundTransactionAsync(transactionId, dto, staffUserId.Value, ct));
        }

        [HttpGet("enterprise-dashboard")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<EnterpriseBillingDashboardDto>> EnterpriseDashboard(CancellationToken ct) =>
            Ok(await _service.GetEnterpriseDashboardAsync(ct));

        [HttpGet("member-ledger/{userId:int}")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MemberLedgerDto>> MemberLedger(int userId, CancellationToken ct) =>
            Ok(await _service.GetMemberLedgerAsync(userId, ct));

        [HttpGet("reports/{reportType}")]
        [HasPermission(PermissionCodes.Reports)]
        public async Task<ActionResult<BillingReportDto>> Report(
            string reportType,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            CancellationToken ct) =>
            Ok(await _service.GetReportAsync(reportType, fromDate, toDate, ct));

        [HttpGet("audit-logs")]
        [HasPermission(PermissionCodes.ViewFinancialAudit)]
        public async Task<ActionResult<IReadOnlyList<FinancialAuditLogDto>>> AuditLogs(
            CancellationToken ct,
            [FromQuery] int? membershipPaymentId,
            [FromQuery] int? userId,
            [FromQuery] int take = 50) =>
            Ok(await _service.GetAuditLogsAsync(membershipPaymentId, userId, take, ct));

        private int? ResolveStaffUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
