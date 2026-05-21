namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Audit record for each time a coupon is redeemed during payment.
    /// </summary>
    public class CouponUsage : BaseEntity
    {
        public int CouponId { get; set; }
        public int UserId { get; set; }

        /// <summary>The MembershipPayment header this coupon was applied to.</summary>
        public int MembershipPaymentId { get; set; }

        /// <summary>Invoice generated for this payment (if any).</summary>
        public int? InvoiceId { get; set; }

        /// <summary>Actual discount amount applied.</summary>
        public decimal DiscountAmount { get; set; }

        public DateTime UsedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Coupon Coupon { get; set; } = null!;
        public User User { get; set; } = null!;
        public MembershipPayment MembershipPayment { get; set; } = null!;
        public Invoice? Invoice { get; set; }
    }
}
