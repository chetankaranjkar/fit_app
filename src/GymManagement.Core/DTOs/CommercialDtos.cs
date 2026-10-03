namespace GymManagement.Core.DTOs
{
    public sealed class PublicCommercialConfigDto
    {
        public bool EnableSelfSignup { get; set; }
        public bool EnableOnlinePayments { get; set; }
        public string? RazorpayKeyId { get; set; }
        public string CheckoutBusinessName { get; set; } = "Tiger Fitness";
    }

    public sealed class PublicMembershipPlanDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string? Description { get; set; }
    }

    public sealed class PublicSignupRequestDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public int PlanId { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
    }

    public sealed class PublicSignupResultDto
    {
        public UserDto Member { get; set; } = null!;
        public LoginResponseDto? Session { get; set; }
        public int? OpenMembershipPaymentId { get; set; }
        public decimal? PendingAmount { get; set; }
    }

    public sealed class CreateRazorpayOrderRequestDto
    {
        /// <summary>When omitted, the member's latest open billing record is used.</summary>
        public int? MembershipPaymentId { get; set; }
    }

    public sealed class RazorpayOrderResponseDto
    {
        public string OrderId { get; set; } = string.Empty;
        public string KeyId { get; set; } = string.Empty;
        public int AmountPaise { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public int MembershipPaymentId { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string? MemberEmail { get; set; }
        public string? MemberPhone { get; set; }
        public string? MemberName { get; set; }
    }

    public sealed class RazorpayVerifyRequestDto
    {
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpaySignature { get; set; } = string.Empty;
    }

    public sealed class RazorpayVerifyResponseDto
    {
        /// <summary>True only when the installment is recorded (see <see cref="Status"/> for recoverable states).</summary>
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        /// <summary>completed | pending_verification | processing | review_required | failed | cancelled | pending.</summary>
        public string Status { get; set; } = "completed";
        public string? OrderId { get; set; }
        public MembershipPaymentDto? Payment { get; set; }
    }

    public sealed class OnlinePaymentAttemptDto
    {
        public string OrderId { get; set; } = string.Empty;
        public int MembershipPaymentId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal? CapturedAmount { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }

    /// <summary>Member pay page state: settle an existing bill vs renewal at reception, plus the latest checkout attempt.</summary>
    public sealed class MemberOnlinePaymentSummaryDto
    {
        public bool OnlinePaymentsEnabled { get; set; }
        /// <summary>settle_outstanding | renewal_required | billing_closed | nothing_due.</summary>
        public string PaymentNeed { get; set; } = "nothing_due";
        public string Message { get; set; } = string.Empty;
        public int? MembershipPaymentId { get; set; }
        public decimal OutstandingAmount { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string? PlanName { get; set; }
        public string? MembershipStatus { get; set; }
        public DateTime? MembershipEndDate { get; set; }
        public OnlinePaymentAttemptDto? LatestAttempt { get; set; }
    }

    public sealed class RazorpayWebhookResultDto
    {
        public bool Handled { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
