using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface ICommercialSignupService
    {
        Task<IReadOnlyList<PublicMembershipPlanDto>> GetPublicPlansAsync(int branchId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<PublicBranchOptionDto>> GetPublicBranchesAsync(CancellationToken cancellationToken = default);
        Task<PublicSignupResultDto> SignupAsync(PublicSignupRequestDto request, CancellationToken cancellationToken = default);
    }

    public interface IOnlinePaymentService
    {
        Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(
            int userId,
            CreateRazorpayOrderRequestDto request,
            CancellationToken cancellationToken = default);

        Task<RazorpayVerifyResponseDto> VerifyRazorpayPaymentAsync(
            int userId,
            RazorpayVerifyRequestDto request,
            CancellationToken cancellationToken = default);

        /// <summary>Checkout dismissed: marks an unpaid attempt cancelled; never touches billing.</summary>
        Task<OnlinePaymentAttemptDto> CancelRazorpayOrderAsync(
            int userId,
            string gatewayOrderId,
            CancellationToken cancellationToken = default);

        /// <summary>Re-checks an attempt with Razorpay when it is not final (reload / lost verify response).</summary>
        Task<OnlinePaymentAttemptDto> GetRazorpayOrderStatusAsync(
            int userId,
            string gatewayOrderId,
            CancellationToken cancellationToken = default);

        Task<MemberOnlinePaymentSummaryDto> GetMemberOnlinePaymentSummaryAsync(
            int userId,
            CancellationToken cancellationToken = default);

        /// <summary>Signed Razorpay webhook (payment.captured / order.paid / payment.failed).</summary>
        Task<RazorpayWebhookResultDto> HandleRazorpayWebhookAsync(
            byte[] rawBody,
            string? signature,
            CancellationToken cancellationToken = default);

        /// <summary>Background sweep: applies captures whose verify/webhook never arrived.</summary>
        Task<int> ReconcileOpenOrdersAsync(CancellationToken cancellationToken = default);
    }
}
