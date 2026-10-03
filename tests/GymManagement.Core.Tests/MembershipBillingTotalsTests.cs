using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Services;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class MembershipBillingTotalsTests
{
    private readonly BillingCalculationService _billing = new();

    private static MembershipPayment Bill(
        decimal fee,
        decimal coupon = 0,
        decimal waiver = 0,
        MembershipPaymentStatus status = MembershipPaymentStatus.Pending) =>
        new()
        {
            TotalAmount = fee,
            OriginalAmount = fee,
            CouponDiscountAmount = coupon,
            WaiverAmount = waiver,
            PaymentStatus = status,
        };

    private static MembershipPaymentTransaction Tx(
        decimal amount,
        MembershipPaymentTransactionStatus status = MembershipPaymentTransactionStatus.Completed,
        bool deleted = false) =>
        new() { TransactionAmount = amount, Status = status, IsDeleted = deleted };

    [Fact]
    public void Paid_total_counts_only_completed_installments()
    {
        var paid = _billing.SumCompletedPayments(
        [
            Tx(1000),
            Tx(500, MembershipPaymentTransactionStatus.Voided),
            Tx(300, MembershipPaymentTransactionStatus.Refunded),
            Tx(200, deleted: true),
            Tx(250),
        ]);

        Assert.Equal(1250m, paid);
    }

    [Fact]
    public void Net_payable_is_fee_minus_coupon_minus_approved_waive_off()
    {
        var bill = Bill(5000, coupon: 500, waiver: 250);

        _billing.RecalculateHeader(bill, [Tx(1000)]);

        Assert.Equal(4250m, bill.FinalBillAmount);
        Assert.Equal(1000m, bill.PaidAmount);
        Assert.Equal(3250m, bill.PendingAmount);
    }

    [Fact]
    public void Partial_installment_leaves_bill_partial_with_remaining_balance()
    {
        var bill = Bill(3000);

        _billing.ApplyPaidAndPending(bill, [Tx(1000)]);

        Assert.Equal(MembershipPaymentStatus.Partial, bill.PaymentStatus);
        Assert.Equal(2000m, bill.PendingAmount);
    }

    [Fact]
    public void Installments_that_cover_the_bill_settle_it_within_rounding_tolerance()
    {
        var bill = Bill(3000, status: MembershipPaymentStatus.Partial);
        bill.NextDueDate = DateTime.UtcNow.AddDays(10);

        _billing.ApplyPaidAndPending(bill, [Tx(1000), Tx(1999.99m)]);

        Assert.Equal(MembershipPaymentStatus.Paid, bill.PaymentStatus);
        Assert.Equal(0m, bill.PendingAmount);
        Assert.Null(bill.NextDueDate);
    }

    [Fact]
    public void Voiding_the_settling_installment_reopens_the_balance()
    {
        var bill = Bill(3000, status: MembershipPaymentStatus.Paid);

        _billing.ApplyPaidAndPending(bill, [Tx(1000), Tx(2000, MembershipPaymentTransactionStatus.Voided)]);

        Assert.Equal(MembershipPaymentStatus.Partial, bill.PaymentStatus);
        Assert.Equal(1000m, bill.PaidAmount);
        Assert.Equal(2000m, bill.PendingAmount);
    }

    [Fact]
    public void Refunding_the_only_installment_returns_bill_to_pending()
    {
        var bill = Bill(3000, status: MembershipPaymentStatus.Paid);

        _billing.ApplyPaidAndPending(bill, [Tx(3000, MembershipPaymentTransactionStatus.Refunded)]);

        Assert.Equal(MembershipPaymentStatus.Pending, bill.PaymentStatus);
        Assert.Equal(0m, bill.PaidAmount);
        Assert.Equal(3000m, bill.PendingAmount);
    }

    [Fact]
    public void Overdue_status_is_kept_when_nothing_has_been_paid()
    {
        var bill = Bill(3000, status: MembershipPaymentStatus.Overdue);

        _billing.ApplyPaidAndPending(bill, [Tx(500, MembershipPaymentTransactionStatus.Voided)]);

        Assert.Equal(MembershipPaymentStatus.Overdue, bill.PaymentStatus);
        Assert.Equal(3000m, bill.PendingAmount);
    }
}
