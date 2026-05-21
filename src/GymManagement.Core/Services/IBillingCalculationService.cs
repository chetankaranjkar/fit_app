using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    public sealed class BillingAmounts
    {
        public decimal OriginalAmount { get; init; }
        public decimal ManualDiscountAmount { get; init; }
        public decimal CouponDiscountAmount { get; init; }
        public decimal WaiverAmount { get; init; }
        public decimal FinalBillAmount { get; init; }
        public decimal PaidAmount { get; init; }
        public decimal PendingAmount { get; init; }
    }

    public interface IBillingCalculationService
    {
        BillingAmounts Compute(MembershipPayment header);
        void RecalculateHeader(MembershipPayment header);
        decimal GetNetPayable(MembershipPayment header);
    }
}
