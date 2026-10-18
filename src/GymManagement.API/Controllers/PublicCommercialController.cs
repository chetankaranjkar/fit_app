using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using GymManagement.Core.Branching;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Options;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    /// <summary>Anonymous commercial endpoints: public plan listing and member self-signup.</summary>
    [ApiController]
    [Route("api/public")]
    [AllowAnonymous]
    public class PublicCommercialController : ControllerBase
    {
        private readonly ICommercialSignupService _signupService;
        private readonly IOnlinePaymentService _onlinePaymentService;
        private readonly CommercialOptions _options;

        public PublicCommercialController(
            ICommercialSignupService signupService,
            IOnlinePaymentService onlinePaymentService,
            IOptions<CommercialOptions> options)
        {
            _signupService = signupService;
            _onlinePaymentService = onlinePaymentService;
            _options = options.Value;
        }

        /// <summary>
        /// Razorpay webhook (payment.captured, order.paid, payment.authorized, payment.failed). Signature is checked
        /// against the raw body; repeated deliveries are idempotent. Non-2xx makes Razorpay retry.
        /// </summary>
        [HttpPost("razorpay/webhook")]
        public async Task<ActionResult<RazorpayWebhookResultDto>> RazorpayWebhook(CancellationToken cancellationToken)
        {
            using var buffer = new MemoryStream();
            await Request.Body.CopyToAsync(buffer, cancellationToken).ConfigureAwait(false);
            var signature = Request.Headers["X-Razorpay-Signature"].ToString();

            try
            {
                var result = await _onlinePaymentService
                    .HandleRazorpayWebhookAsync(buffer.ToArray(), signature, cancellationToken)
                    .ConfigureAwait(false);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (System.Text.Json.JsonException)
            {
                return BadRequest(new { message = "Invalid webhook payload." });
            }
        }

        [HttpGet("config")]
        public ActionResult<PublicCommercialConfigDto> GetConfig()
        {
            return Ok(new PublicCommercialConfigDto
            {
                EnableSelfSignup = _options.EnableSelfSignup,
                EnableOnlinePayments = _options.EnableOnlinePayments && _options.IsRazorpayConfigured,
                RazorpayKeyId = _options.EnableOnlinePayments && _options.IsRazorpayConfigured
                    ? _options.RazorpayKeyId
                    : null,
                CheckoutBusinessName = _options.CheckoutBusinessName,
            });
        }

        [HttpGet("membership-plans")]
        public async Task<ActionResult<IReadOnlyList<PublicMembershipPlanDto>>> GetMembershipPlans(
            [FromQuery] int? branchId,
            CancellationToken cancellationToken)
        {
            if (!_options.EnableSelfSignup)
                return Ok(Array.Empty<PublicMembershipPlanDto>());
            if (branchId is not int selectedBranch)
                return Ok(Array.Empty<PublicMembershipPlanDto>());

            try
            {
                var plans = await _signupService.GetPublicPlansAsync(selectedBranch, cancellationToken).ConfigureAwait(false);
                return Ok(plans);
            }
            catch (InvalidOperationException ex) when (BranchAccessRules.IsClientBranchError(ex.Message))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("branches")]
        public async Task<ActionResult<IReadOnlyList<PublicBranchOptionDto>>> Branches(CancellationToken cancellationToken)
        {
            var branches = await _signupService.GetPublicBranchesAsync(cancellationToken).ConfigureAwait(false);
            return Ok(branches);
        }

        [HttpPost("signup")]
        public async Task<ActionResult<PublicSignupResultDto>> Signup(
            [FromBody] PublicSignupRequestDto? request,
            CancellationToken cancellationToken)
        {
            if (request == null)
                return BadRequest(new { message = "Request body is required." });

            try
            {
                var result = await _signupService.SignupAsync(request, cancellationToken).ConfigureAwait(false);
                return Ok(result);
            }
            catch (InvalidOperationException ex) when (BranchAccessRules.IsClientBranchError(ex.Message))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
