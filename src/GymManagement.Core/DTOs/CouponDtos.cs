using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public sealed class CouponDto
    {
        public int Id { get; set; }
        public string CouponCode { get; set; } = string.Empty;
        public string CouponName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DiscountType DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal MinimumInvoiceAmount { get; set; }
        public decimal? MaximumDiscountAmount { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public int UsageLimit { get; set; }
        public int UsedCount { get; set; }
        public int PerUserLimit { get; set; }
        public List<int>? ApplicableMembershipIds { get; set; }
        public List<int>? ApplicableBranchIds { get; set; }
        public List<string>? ApplicableUserTypes { get; set; }
        public CouponStatus Status { get; set; }
        public bool AllowMultipleUsage { get; set; }
        public bool AllowSameUserMultipleUsage { get; set; }
        public bool AllowSameInvoiceMultipleUsage { get; set; }
        public bool FirstTimeUserOnly { get; set; }
        public bool ApplicableOnPartialPayment { get; set; }
        public int? CreatedByUserId { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }

    public sealed class CreateCouponDto
    {
        public string CouponCode { get; set; } = string.Empty;
        public string CouponName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DiscountType DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal MinimumInvoiceAmount { get; set; }
        public decimal? MaximumDiscountAmount { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public int UsageLimit { get; set; } = 100;
        public int PerUserLimit { get; set; } = 1;
        public List<int>? ApplicableMembershipIds { get; set; }
        public List<int>? ApplicableBranchIds { get; set; }
        public List<string>? ApplicableUserTypes { get; set; }
    }

    public sealed class UpdateCouponDto
    {
        public string? CouponName { get; set; }
        public string? Description { get; set; }
        public DiscountType? DiscountType { get; set; }
        public decimal? DiscountValue { get; set; }
        public decimal? MinimumInvoiceAmount { get; set; }
        public decimal? MaximumDiscountAmount { get; set; }
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }
        public int? UsageLimit { get; set; }
        public int? PerUserLimit { get; set; }
        public List<int>? ApplicableMembershipIds { get; set; }
        public List<int>? ApplicableBranchIds { get; set; }
        public List<string>? ApplicableUserTypes { get; set; }
        public CouponStatus? Status { get; set; }
    }

    public sealed class ValidateCouponRequest
    {
        public string CouponCode { get; set; } = string.Empty;
        public int MembershipPlanId { get; set; }
        public decimal InvoiceAmount { get; set; }
        public int UserId { get; set; }
        public int? BranchId { get; set; }
        /// <summary>When set, validates against an existing membership billing invoice.</summary>
        public int? MembershipPaymentId { get; set; }
    }

    public sealed class ValidateCouponResponse
    {
        public bool Valid { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? CouponId { get; set; }
        public string? CouponCode { get; set; }
    }

    public sealed class CouponUsageDto
    {
        public int Id { get; set; }
        public int CouponId { get; set; }
        public string CouponCode { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public int MembershipPaymentId { get; set; }
        public int? InvoiceId { get; set; }
        public decimal DiscountAmount { get; set; }
        public DateTime UsedAt { get; set; }
    }

    public sealed class CouponAnalyticsDto
    {
        public int ActiveCoupons { get; set; }
        public int ExpiredCoupons { get; set; }
        public int DisabledCoupons { get; set; }
        public decimal TotalDiscountGiven { get; set; }
        public CouponDto? MostUsedCoupon { get; set; }
        public decimal RevenueImpact { get; set; }
        public decimal RevenueAfterDiscount { get; set; }
        public decimal CouponConversionRate { get; set; }
    }
}
