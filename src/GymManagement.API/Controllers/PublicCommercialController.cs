using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
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
        private readonly CommercialOptions _options;

        public PublicCommercialController(
            ICommercialSignupService signupService,
            IOptions<CommercialOptions> options)
        {
            _signupService = signupService;
            _options = options.Value;
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
            CancellationToken cancellationToken)
        {
            if (!_options.EnableSelfSignup)
                return Ok(Array.Empty<PublicMembershipPlanDto>());

            var plans = await _signupService.GetPublicPlansAsync(cancellationToken).ConfigureAwait(false);
            return Ok(plans);
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
