using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface ICommercialSignupService
    {
        Task<IReadOnlyList<PublicMembershipPlanDto>> GetPublicPlansAsync(CancellationToken cancellationToken = default);
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
    }
}
