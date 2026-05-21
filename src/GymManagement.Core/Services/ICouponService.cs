using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface ICouponService
    {
        Task<IReadOnlyList<CouponDto>> GetAllAsync(string? search = null, string? status = null, CancellationToken ct = default);
        Task<CouponDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<CouponDto> CreateAsync(CreateCouponDto dto, int? createdByUserId, CancellationToken ct = default);
        Task<CouponDto?> UpdateAsync(int id, UpdateCouponDto dto, CancellationToken ct = default);
        Task<bool> DisableAsync(int id, CancellationToken ct = default);
        Task<ValidateCouponResponse> ValidateAsync(ValidateCouponRequest request, CancellationToken ct = default);

        /// <summary>
        /// Applies a validated coupon to a membership payment. Call within a transaction.
        /// Returns the discount amount applied.
        /// </summary>
        Task<decimal> ApplyCouponAsync(int couponId, int userId, int membershipPaymentId, decimal invoiceAmount, CancellationToken ct = default);

        /// <summary>Reverses coupon usage when removed before any payment (same transaction as caller).</summary>
        Task RevokeCouponUsageForBillingAsync(int membershipPaymentId, CancellationToken ct = default);

        Task<IReadOnlyList<CouponUsageDto>> GetUsagesAsync(int couponId, CancellationToken ct = default);
        Task<CouponAnalyticsDto> GetAnalyticsAsync(CancellationToken ct = default);

        /// <summary>Marks expired coupons (valid_to passed) as Expired. Called by background job.</summary>
        Task<int> ExpireOverdueCouponsAsync(CancellationToken ct = default);
    }
}
