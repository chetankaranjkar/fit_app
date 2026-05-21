namespace GymManagement.Domain.Entities
{
    public enum DiscountType
    {
        Percentage,
        Fixed
    }

    public enum CouponStatus
    {
        Active,
        Expired,
        Disabled
    }

    /// <summary>
    /// Promotional coupon that can be applied during membership payment.
    /// Supports percentage/fixed discounts, usage limits, branch/membership targeting.
    /// </summary>
    public class Coupon : BaseEntity
    {
        public string CouponCode { get; set; } = string.Empty;
        public string CouponName { get; set; } = string.Empty;
        public string? Description { get; set; }

        public DiscountType DiscountType { get; set; }
        public decimal DiscountValue { get; set; }

        /// <summary>Minimum invoice/payment amount required to apply this coupon.</summary>
        public decimal MinimumInvoiceAmount { get; set; }

        /// <summary>Cap on the discount amount (relevant for percentage coupons).</summary>
        public decimal? MaximumDiscountAmount { get; set; }

        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }

        /// <summary>Total number of times this coupon can be used across all users.</summary>
        public int UsageLimit { get; set; }

        /// <summary>Number of times this coupon has been used.</summary>
        public int UsedCount { get; set; }

        /// <summary>Maximum times a single user can use this coupon.</summary>
        public int PerUserLimit { get; set; } = 1;

        /// <summary>JSON array of membership plan IDs this coupon applies to. Empty = all plans.</summary>
        public string? ApplicableMembershipIds { get; set; }

        /// <summary>JSON array of branch IDs this coupon applies to. Empty = all branches.</summary>
        public string? ApplicableBranchIds { get; set; }

        /// <summary>JSON array of user type names this coupon applies to. Empty = all user types.</summary>
        public string? ApplicableUserTypes { get; set; }

        public CouponStatus Status { get; set; } = CouponStatus.Active;

        /// <summary>User ID of the admin who created this coupon.</summary>
        public int? CreatedByUserId { get; set; }

        public int? OrganizationId { get; set; }

        public bool AllowMultipleUsage { get; set; }
        public bool AllowSameUserMultipleUsage { get; set; }
        public bool AllowSameInvoiceMultipleUsage { get; set; }
        public bool FirstTimeUserOnly { get; set; }
        public bool ApplicableOnPartialPayment { get; set; }

        // Navigation
        public User? CreatedByUser { get; set; }
        public Organization? Organization { get; set; }
        public ICollection<CouponUsage> Usages { get; set; } = new List<CouponUsage>();
    }
}
