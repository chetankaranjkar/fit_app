using System.Text;
using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class RazorpayPaymentRulesTests
{
    private const string Secret = "test_key_secret";
    private const string OrderId = "order_ABC";
    private const string PaymentId = "pay_123";

    private static OnlinePaymentApplyContext Context(
        OnlinePaymentOrderStatus status = OnlinePaymentOrderStatus.Pending,
        string? orderPaymentId = null,
        decimal orderAmount = 1500m,
        bool ledgerHasPayment = false,
        bool billingOpen = true,
        decimal outstanding = 1500m,
        bool processingStale = false,
        string currency = "INR") =>
        new(status, OrderId, orderPaymentId, orderAmount, currency, ledgerHasPayment, billingOpen, outstanding, processingStale);

    private static GatewayPaymentSnapshot Payment(
        string status = "captured",
        long amountPaise = 150000,
        string paymentId = PaymentId,
        string? orderId = OrderId,
        string? currency = "INR") =>
        new(paymentId, orderId, status, amountPaise, currency);

    [Fact]
    public void Checkout_signature_matches_hmac_of_order_and_payment()
    {
        var signature = RazorpayPaymentRules.ComputeHmacSha256Hex(Secret, Encoding.UTF8.GetBytes($"{OrderId}|{PaymentId}"));

        Assert.True(RazorpayPaymentRules.IsValidCheckoutSignature(OrderId, PaymentId, signature, Secret));
        Assert.True(RazorpayPaymentRules.IsValidCheckoutSignature(OrderId, PaymentId, signature.ToUpperInvariant(), Secret));
    }

    [Theory]
    [InlineData("pay_other")]
    [InlineData(null)]
    public void Checkout_signature_mismatch_is_rejected(string? tamperedPaymentId)
    {
        var signature = RazorpayPaymentRules.ComputeHmacSha256Hex(Secret, Encoding.UTF8.GetBytes($"{OrderId}|{PaymentId}"));

        if (tamperedPaymentId == null)
        {
            Assert.False(RazorpayPaymentRules.IsValidCheckoutSignature(OrderId, PaymentId, "", Secret));
            Assert.False(RazorpayPaymentRules.IsValidCheckoutSignature(OrderId, PaymentId, signature, "wrong_secret"));
        }
        else
        {
            Assert.False(RazorpayPaymentRules.IsValidCheckoutSignature(OrderId, tamperedPaymentId, signature, Secret));
        }
    }

    [Fact]
    public void Webhook_signature_covers_the_raw_body()
    {
        var body = Encoding.UTF8.GetBytes("{\"event\":\"payment.captured\"}");
        var signature = RazorpayPaymentRules.ComputeHmacSha256Hex("whsec", body);

        Assert.True(RazorpayPaymentRules.IsValidWebhookSignature(body, signature, "whsec"));
        Assert.False(RazorpayPaymentRules.IsValidWebhookSignature(Encoding.UTF8.GetBytes("{\"event\":\"order.paid\"}"), signature, "whsec"));
        Assert.False(RazorpayPaymentRules.IsValidWebhookSignature(body, null, "whsec"));
    }

    [Fact]
    public void Captured_payment_matching_order_and_outstanding_is_recorded()
    {
        var decision = RazorpayPaymentRules.Decide(Context(), Payment());

        Assert.Equal(OnlinePaymentAction.Record, decision.Action);
        Assert.Equal(1500m, decision.Amount);
        Assert.True(RazorpayPaymentRules.IsFullSettlement(decision.Amount, 1500m));
    }

    [Theory]
    [InlineData(OnlinePaymentOrderStatus.Completed)]
    [InlineData(OnlinePaymentOrderStatus.ReviewRequired)]
    public void Repeated_verify_or_webhook_for_same_payment_is_already_applied(OnlinePaymentOrderStatus status)
    {
        var decision = RazorpayPaymentRules.Decide(Context(status, orderPaymentId: PaymentId), Payment());

        Assert.Equal(OnlinePaymentAction.AlreadyApplied, decision.Action);
    }

    [Fact]
    public void Ledger_entry_without_completed_order_is_linked_not_recorded_again()
    {
        var decision = RazorpayPaymentRules.Decide(
            Context(OnlinePaymentOrderStatus.Processing, processingStale: true, ledgerHasPayment: true, outstanding: 0),
            Payment());

        Assert.Equal(OnlinePaymentAction.LinkExistingInstallment, decision.Action);
    }

    [Fact]
    public void Concurrent_request_holding_a_fresh_claim_is_in_progress()
    {
        Assert.Equal(
            OnlinePaymentAction.InProgress,
            RazorpayPaymentRules.Decide(Context(OnlinePaymentOrderStatus.Processing), Payment()).Action);
        Assert.Equal(
            OnlinePaymentAction.Record,
            RazorpayPaymentRules.Decide(Context(OnlinePaymentOrderStatus.Processing, processingStale: true), Payment()).Action);
    }

    [Fact]
    public void Amount_mismatch_against_server_order_is_flagged_for_review()
    {
        var decision = RazorpayPaymentRules.Decide(Context(), Payment(amountPaise: 100000));

        Assert.Equal(OnlinePaymentAction.ReviewRequired, decision.Action);
        Assert.Equal(RazorpayPaymentRules.Reasons.AmountMismatch, decision.Reason);
    }

    [Fact]
    public void Currency_mismatch_is_flagged_for_review()
    {
        var decision = RazorpayPaymentRules.Decide(Context(), Payment(currency: "USD"));

        Assert.Equal(RazorpayPaymentRules.Reasons.CurrencyMismatch, decision.Reason);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(500)]
    public void Capture_above_current_outstanding_is_flagged_not_recorded(int outstandingNow)
    {
        var decision = RazorpayPaymentRules.Decide(Context(outstanding: outstandingNow), Payment());

        Assert.Equal(OnlinePaymentAction.ReviewRequired, decision.Action);
        Assert.Equal(RazorpayPaymentRules.Reasons.Overpayment, decision.Reason);
        Assert.Equal(1500m, decision.Amount);
    }

    [Fact]
    public void Capture_below_increased_outstanding_is_recorded_as_partial()
    {
        var decision = RazorpayPaymentRules.Decide(Context(outstanding: 2000m), Payment());

        Assert.Equal(OnlinePaymentAction.Record, decision.Action);
        Assert.False(RazorpayPaymentRules.IsFullSettlement(decision.Amount, 2000m));
    }

    [Fact]
    public void Closed_billing_is_flagged_for_review()
    {
        var decision = RazorpayPaymentRules.Decide(Context(billingOpen: false), Payment());

        Assert.Equal(RazorpayPaymentRules.Reasons.BillingClosed, decision.Reason);
    }

    [Theory]
    [InlineData(OnlinePaymentOrderStatus.Cancelled)]
    [InlineData(OnlinePaymentOrderStatus.Failed)]
    [InlineData(OnlinePaymentOrderStatus.PendingVerification)]
    public void Late_capture_on_cancelled_failed_or_unverified_attempt_is_still_recorded(OnlinePaymentOrderStatus status)
    {
        Assert.Equal(OnlinePaymentAction.Record, RazorpayPaymentRules.Decide(Context(status), Payment()).Action);
        Assert.True(RazorpayPaymentRules.IsClaimable(status, null, DateTime.UtcNow));
    }

    [Fact]
    public void Authorized_payment_waits_for_capture()
    {
        var decision = RazorpayPaymentRules.Decide(Context(), Payment(status: "authorized"));

        Assert.Equal(OnlinePaymentAction.AwaitCapture, decision.Action);
    }

    [Fact]
    public void Failed_retry_does_not_mask_a_different_attempt()
    {
        Assert.Equal(
            OnlinePaymentAction.MarkFailed,
            RazorpayPaymentRules.Decide(Context(), Payment(status: "failed")).Action);
        Assert.Equal(
            OnlinePaymentAction.Ignore,
            RazorpayPaymentRules.Decide(
                Context(OnlinePaymentOrderStatus.PendingVerification, orderPaymentId: "pay_first"),
                Payment(status: "failed")).Action);
    }

    [Fact]
    public void Second_capture_on_settled_order_is_a_duplicate_capture()
    {
        var decision = RazorpayPaymentRules.Decide(
            Context(OnlinePaymentOrderStatus.Completed, orderPaymentId: "pay_first"),
            Payment(paymentId: "pay_second"));

        Assert.Equal(OnlinePaymentAction.DuplicateCapture, decision.Action);
    }

    [Fact]
    public void Payment_for_another_order_is_rejected()
    {
        Assert.Equal(
            OnlinePaymentAction.Reject,
            RazorpayPaymentRules.Decide(Context(), Payment(orderId: "order_OTHER")).Action);
    }

    [Theory]
    [InlineData(OnlinePaymentOrderStatus.Pending, true)]
    [InlineData(OnlinePaymentOrderStatus.Failed, true)]
    [InlineData(OnlinePaymentOrderStatus.Completed, false)]
    [InlineData(OnlinePaymentOrderStatus.PendingVerification, false)]
    [InlineData(OnlinePaymentOrderStatus.Processing, false)]
    [InlineData(OnlinePaymentOrderStatus.ReviewRequired, false)]
    public void Only_unpaid_attempts_can_be_cancelled(OnlinePaymentOrderStatus status, bool expected)
    {
        Assert.Equal(expected, RazorpayPaymentRules.CanCancel(status));
    }

    [Theory]
    [InlineData(OnlinePaymentOrderStatus.PendingVerification, true)]
    [InlineData(OnlinePaymentOrderStatus.Processing, true)]
    [InlineData(OnlinePaymentOrderStatus.Pending, false)]
    [InlineData(OnlinePaymentOrderStatus.Cancelled, false)]
    public void Payment_being_confirmed_blocks_a_new_order(OnlinePaymentOrderStatus status, bool expected)
    {
        Assert.Equal(expected, RazorpayPaymentRules.BlocksNewOrder(status));
    }

    [Fact]
    public void Pending_order_is_reused_only_for_same_amount_within_window()
    {
        var now = new DateTime(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

        Assert.True(RazorpayPaymentRules.CanReuseOrder(OnlinePaymentOrderStatus.Pending, 1500m, now.AddMinutes(-5), 1500m, now));
        Assert.False(RazorpayPaymentRules.CanReuseOrder(OnlinePaymentOrderStatus.Pending, 1500m, now.AddMinutes(-5), 1000m, now));
        Assert.False(RazorpayPaymentRules.CanReuseOrder(OnlinePaymentOrderStatus.Pending, 1500m, now.AddHours(-2), 1500m, now));
        Assert.False(RazorpayPaymentRules.CanReuseOrder(OnlinePaymentOrderStatus.Cancelled, 1500m, now, 1500m, now));
    }

    [Fact]
    public void Stale_processing_claim_becomes_claimable()
    {
        var now = DateTime.UtcNow;

        Assert.False(RazorpayPaymentRules.IsClaimable(OnlinePaymentOrderStatus.Processing, now.AddSeconds(-30), now));
        Assert.True(RazorpayPaymentRules.IsClaimable(OnlinePaymentOrderStatus.Processing, now.AddMinutes(-10), now));
        Assert.False(RazorpayPaymentRules.IsClaimable(OnlinePaymentOrderStatus.Completed, null, now));
    }

    [Fact]
    public void Settlement_and_renewal_are_distinguished()
    {
        var today = new DateTime(2026, 10, 3, 0, 0, 0, DateTimeKind.Utc);

        Assert.Equal(
            MemberOnlinePaymentNeed.SettleOutstanding,
            RazorpayPaymentRules.ClassifyNeed(true, true, MembershipStatus.ActivePendingPayment, today.AddDays(20), today));
        Assert.Equal(
            MemberOnlinePaymentNeed.BillingClosed,
            RazorpayPaymentRules.ClassifyNeed(true, false, MembershipStatus.Cancelled, today.AddDays(20), today));
        Assert.Equal(
            MemberOnlinePaymentNeed.RenewalRequired,
            RazorpayPaymentRules.ClassifyNeed(false, false, MembershipStatus.Expired, today.AddDays(-3), today));
        Assert.Equal(
            MemberOnlinePaymentNeed.RenewalRequired,
            RazorpayPaymentRules.ClassifyNeed(false, false, MembershipStatus.Active, today.AddDays(-1), today));
        Assert.Equal(
            MemberOnlinePaymentNeed.NothingDue,
            RazorpayPaymentRules.ClassifyNeed(false, false, MembershipStatus.Active, today.AddDays(10), today));
        Assert.Equal(
            MemberOnlinePaymentNeed.NothingDue,
            RazorpayPaymentRules.ClassifyNeed(false, false, null, null, today));
    }

    [Theory]
    [InlineData("1499.995", 150000)]
    [InlineData("0.01", 1)]
    [InlineData("1234.5", 123450)]
    public void Paise_conversion_rounds_half_away_from_zero(string amount, int expectedPaise)
    {
        Assert.Equal(
            expectedPaise,
            RazorpayPaymentRules.ToPaise(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)));
    }
}
