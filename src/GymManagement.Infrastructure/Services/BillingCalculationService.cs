using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public sealed class BillingCalculationService : IBillingCalculationService
    {
        public BillingAmounts Compute(MembershipPayment header)
        {
            var original = GetOriginalAmount(header);
            var final = GetFinalBillAmount(header, original);
            var paid = header.PaidAmount;
            var pending = Math.Max(0, final - paid);
            return new BillingAmounts
            {
                OriginalAmount = original,
                ManualDiscountAmount = header.DiscountAmount,
                CouponDiscountAmount = header.CouponDiscountAmount,
                WaiverAmount = header.WaiverAmount,
                FinalBillAmount = final,
                PaidAmount = paid,
                PendingAmount = pending,
            };
        }

        public void RecalculateHeader(MembershipPayment header)
        {
            NormalizeLegacyDiscount(header);
            var original = GetOriginalAmount(header);
            header.OriginalAmount = original;
            header.FinalBillAmount = GetFinalBillAmount(header, original);
            header.PendingAmount = Math.Max(0, header.FinalBillAmount - header.PaidAmount);
        }

        /// <summary>
        /// Older flows stored coupon savings inside DiscountAmount; avoid subtracting twice.
        /// </summary>
        private static void NormalizeLegacyDiscount(MembershipPayment header)
        {
            if (!header.CouponId.HasValue || header.CouponDiscountAmount <= 0)
                return;
            if (header.DiscountAmount >= header.CouponDiscountAmount)
                header.DiscountAmount -= header.CouponDiscountAmount;
        }

        public decimal GetNetPayable(MembershipPayment header) =>
            Compute(header).FinalBillAmount;

        private static decimal GetOriginalAmount(MembershipPayment header) =>
            header.OriginalAmount > 0 ? header.OriginalAmount : header.TotalAmount;

        private static decimal GetFinalBillAmount(MembershipPayment header, decimal original) =>
            Math.Max(0, original - header.CouponDiscountAmount - header.DiscountAmount - header.WaiverAmount);
    }
}
