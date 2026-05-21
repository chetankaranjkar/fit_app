namespace GymManagement.Domain.Entities
{
    /// <summary>Immutable link between a billing invoice (membership payment) and a coupon.</summary>
    public class InvoiceCouponUsage : BaseEntity
    {
        public int CouponId { get; set; }
        public int? InvoiceId { get; set; }
        public int UserId { get; set; }
        public int MembershipPaymentId { get; set; }

        public decimal OriginalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }

        public CouponUsageType UsageType { get; set; } = CouponUsageType.FirstPayment;

        /// <summary>When true, coupon cannot be removed or replaced on this invoice.</summary>
        public bool Locked { get; set; } = true;

        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

        public Coupon Coupon { get; set; } = null!;
        public Invoice? Invoice { get; set; }
        public User User { get; set; } = null!;
        public MembershipPayment MembershipPayment { get; set; } = null!;
    }
}
