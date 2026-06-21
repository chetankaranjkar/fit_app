namespace GymManagement.Domain.Entities
{
    public enum OnlinePaymentOrderStatus
    {
        Pending,
        Completed,
        Failed,
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

        public MembershipPayment MembershipPayment { get; set; } = null!;
    }
}
