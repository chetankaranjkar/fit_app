using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    /// <summary>Alias routes for membership billing / coupon APIs (spec-compatible paths).</summary>
    [ApiController]
    [Route("api/payments")]
    [Authorize]
    public class PaymentsBillingController : ControllerBase
    {
        private readonly IMembershipPaymentService _billing;

        public PaymentsBillingController(IMembershipPaymentService billing)
        {
            _billing = billing;
        }

        [HttpPost("apply-coupon")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDto>> ApplyCoupon(
            [FromBody] ApplyCouponToPaymentRequest dto,
            CancellationToken ct) =>
            Ok(await _billing.ApplyCouponAsync(dto.MembershipPaymentId, new ApplyCouponToPaymentDto
            {
                CouponCode = dto.CouponCode,
            }, ct));

        [HttpPost("remove-coupon")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MembershipPaymentDto>> RemoveCoupon(
            [FromBody] RemoveCouponFromPaymentRequest dto,
            CancellationToken ct) =>
            Ok(await _billing.RemoveCouponAsync(dto.MembershipPaymentId, ct));
    }

    public sealed class ApplyCouponToPaymentRequest
    {
        public int MembershipPaymentId { get; set; }
        public string CouponCode { get; set; } = string.Empty;
    }

    public sealed class RemoveCouponFromPaymentRequest
    {
        public int MembershipPaymentId { get; set; }
    }
}
