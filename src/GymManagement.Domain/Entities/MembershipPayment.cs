namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Enterprise billing header for a single <see cref="UserMembership"/> (one active row per membership).
    /// Installments are stored in <see cref="MembershipPaymentTransaction"/>.
    /// </summary>
    public class MembershipPayment : BaseEntity
    {
        /// <summary>Human-readable unique number (e.g. MP-2026-000001).</summary>
        public string PaymentNumber { get; set; } = string.Empty;

        public int UserId { get; set; }
        public int MembershipId { get; set; }

        /// <summary>Optional link to generated pro-forma or final invoice.</summary>
        public string? InvoiceNumber { get; set; }

        public int? InvoiceId { get; set; }

        /// <summary>Gross amount (plan total) before discount.</summary>
        public decimal TotalAmount { get; set; }

        /// <summary>Original membership amount at billing creation (same as plan price).</summary>
        public decimal OriginalAmount { get; set; }

        /// <summary>Authoritative amount due after all discounts (installments use this).</summary>
        public decimal FinalBillAmount { get; set; }

        /// <summary>Sum of successful installment amounts (net of overpayment guard).</summary>
        public decimal PaidAmount { get; set; }

        /// <summary>Cached pending = NetPayable - PaidAmount.</summary>
        public decimal PendingAmount { get; set; }

        public decimal DiscountAmount { get; set; }

        /// <summary>Optional write-off / waiver (future-ready).</summary>
        public decimal WaiverAmount { get; set; }

        public MembershipPaymentStatus PaymentStatus { get; set; } = MembershipPaymentStatus.Pending;

        public MembershipPaymentMethod? LastPaymentMethod { get; set; }

        /// <summary>Last time money was collected (header-level).</summary>
        public DateTime? PaymentDate { get; set; }

        /// <summary>Required while status is Partial / Overdue with outstanding balance.</summary>
        public DateTime? NextDueDate { get; set; }

        public string? Notes { get; set; }

        /// <summary><see cref="User.Id"/> of staff who last updated payment header (optional).</summary>
        public int? ReceivedByUserId { get; set; }

        public DateTime? DueReminderLastSentAt { get; set; }

        public int? OrganizationId { get; set; }

        /// <summary>Coupon applied to this payment (if any).</summary>
        public int? CouponId { get; set; }
        /// <summary>Coupon code snapshot at time of application.</summary>
        public string? CouponCode { get; set; }
        public DiscountType? CouponDiscountType { get; set; }
        public decimal? CouponDiscountValue { get; set; }
        /// <summary>Discount amount from coupon only.</summary>
        public decimal CouponDiscountAmount { get; set; }

        /// <summary>When true, coupon cannot be changed or removed.</summary>
        public bool CouponLocked { get; set; }

        public DateTime? CouponAppliedAt { get; set; }

        public User User { get; set; } = null!;
        public UserMembership Membership { get; set; } = null!;
        public Invoice? Invoice { get; set; }
        public Organization? Organization { get; set; }

        public ICollection<MembershipPaymentTransaction> Transactions { get; set; } =
            new List<MembershipPaymentTransaction>();
    }
}
