namespace GymManagement.Domain.Entities
{
    public enum OnlinePaymentOrderStatus
    {
        /// <summary>Order created; checkout not finished.</summary>
        Pending,
        Completed,
        /// <summary>Gateway reported a failed attempt; a later capture on the same order is still applied.</summary>
        Failed,
        /// <summary>Gateway payment id known but capture not yet confirmed (verify failed, authorized only, gateway unreachable).</summary>
        PendingVerification,
        /// <summary>Short-lived claim while the installment is being recorded.</summary>
        Processing,
        /// <summary>Checkout dismissed or order superseded; billing untouched.</summary>
        Cancelled,
        /// <summary>Money captured but not applied (overpayment, amount mismatch, billing closed) — staff refund/review.</summary>
        ReviewRequired,
    }

    /// <summary>Tracks a Razorpay (or future gateway) order against membership billing.</summary>
    public class OnlinePaymentOrder : BaseEntity
    {
        public int MembershipPaymentId { get; set; }
        public int UserId { get; set; }
        public string Gateway { get; set; } = "Razorpay";
        public string GatewayOrderId { get; set; } = string.Empty;
        public string? GatewayPaymentId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public OnlinePaymentOrderStatus Status { get; set; } = OnlinePaymentOrderStatus.Pending;

        /// <summary>Amount the gateway reports as captured (may differ from <see cref="Amount"/> on review rows).</summary>
        public decimal? CapturedAmount { get; set; }

        /// <summary>Machine-readable reason for the current status (e.g. overpayment, checkout_dismissed).</summary>
        public string? StatusReason { get; set; }

        /// <summary>Ledger installment created from this order.</summary>
        public int? MembershipPaymentTransactionId { get; set; }

        public DateTime? ProcessingStartedAt { get; set; }
        public DateTime? LastCheckedAt { get; set; }

        public MembershipPayment MembershipPayment { get; set; } = null!;
    }
}
