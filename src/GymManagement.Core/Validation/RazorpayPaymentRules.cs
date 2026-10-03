using System.Security.Cryptography;
using System.Text;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Validation;

/// <summary>Payment entity as reported by Razorpay (API fetch or signed webhook payload).</summary>
public sealed record GatewayPaymentSnapshot(
    string PaymentId,
    string? OrderId,
    string Status,
    long AmountPaise,
    string? Currency);

/// <summary>Server-side state needed to decide what a gateway payment does to billing.</summary>
public sealed record OnlinePaymentApplyContext(
    OnlinePaymentOrderStatus OrderStatus,
    string GatewayOrderId,
    string? OrderGatewayPaymentId,
    decimal OrderAmount,
    string OrderCurrency,
    bool LedgerHasPayment,
    bool BillingOpen,
    decimal Outstanding,
    bool ProcessingStale);

public enum OnlinePaymentAction
{
    /// <summary>Record an installment for <see cref="OnlinePaymentDecision.Amount"/>.</summary>
    Record,
    /// <summary>This gateway payment was already handled; return the existing result.</summary>
    AlreadyApplied,
    /// <summary>Ledger already holds the installment (crash between ledger write and order update); link it.</summary>
    LinkExistingInstallment,
    /// <summary>Authorized / created but not captured yet; keep the attempt recoverable.</summary>
    AwaitCapture,
    MarkFailed,
    /// <summary>Money captured but must not touch billing totals; flag for refund/review.</summary>
    ReviewRequired,
    /// <summary>Another request holds the processing claim.</summary>
    InProgress,
    /// <summary>A second captured payment on an order that is already settled or flagged.</summary>
    DuplicateCapture,
    /// <summary>Payment does not belong to this order.</summary>
    Reject,
    Ignore,
}

public sealed record OnlinePaymentDecision(OnlinePaymentAction Action, string? Reason = null, decimal Amount = 0);

/// <summary>Member-facing classification: settle an existing bill vs renew a membership period.</summary>
public enum MemberOnlinePaymentNeed
{
    SettleOutstanding,
    RenewalRequired,
    BillingClosed,
    NothingDue,
}

/// <summary>
/// Pure decisions for Razorpay checkout, verify, webhook, and reconciliation. Online payments only settle the
/// outstanding balance of an existing billing header; they never extend membership dates.
/// </summary>
public static class RazorpayPaymentRules
{
    public const decimal AmountTolerance = 0.02m;
    public const string SupportedCurrency = "INR";

    public static readonly TimeSpan OrderReuseWindow = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan ProcessingStaleAfter = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan ReconcileWindow = TimeSpan.FromDays(3);

    public static class Reasons
    {
        public const string Overpayment = "overpayment";
        public const string AmountMismatch = "amount_mismatch";
        public const string CurrencyMismatch = "currency_mismatch";
        public const string OrderMismatch = "order_mismatch";
        public const string BillingClosed = "billing_closed";
        public const string AwaitingCapture = "awaiting_capture";
        public const string GatewayUnreachable = "gateway_unreachable";
        public const string RecordingFailed = "recording_failed";
        public const string CheckoutDismissed = "checkout_dismissed";
        public const string Superseded = "superseded";
        public const string PaymentFailed = "payment_failed";
        public const string Expired = "expired_unpaid";
        public const string SecondPaymentOnOrder = "second_payment_on_order";
        public const string GatewayStatusPrefix = "gateway_status_";
    }

    public static int ToPaise(decimal amount) =>
        (int)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);

    public static decimal FromPaise(long paise) => paise / 100m;

    public static string ComputeHmacSha256Hex(string secret, byte[] payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(payload)).ToLowerInvariant();
    }

    /// <summary>Checkout handler signature: HMAC-SHA256(key secret, "order_id|payment_id").</summary>
    public static bool IsValidCheckoutSignature(string orderId, string paymentId, string? signature, string secret) =>
        SignatureMatches(
            ComputeHmacSha256Hex(secret.Trim(), Encoding.UTF8.GetBytes($"{orderId.Trim()}|{paymentId.Trim()}")),
            signature);

    /// <summary>Webhook signature: HMAC-SHA256(webhook secret, raw request body).</summary>
    public static bool IsValidWebhookSignature(byte[] rawBody, string? signature, string secret) =>
        SignatureMatches(ComputeHmacSha256Hex(secret.Trim(), rawBody), signature);

    private static bool SignatureMatches(string expectedHex, string? signature)
    {
        if (string.IsNullOrWhiteSpace(signature))
            return false;
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedHex),
            Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
    }

    public static bool IsProcessingStale(DateTime? processingStartedAt, DateTime nowUtc) =>
        processingStartedAt == null || nowUtc - processingStartedAt.Value >= ProcessingStaleAfter;

    /// <summary>Statuses from which a captured payment may still be applied (late UPI captures land on cancelled/failed attempts).</summary>
    public static bool IsClaimable(OnlinePaymentOrderStatus status, DateTime? processingStartedAt, DateTime nowUtc) =>
        status is OnlinePaymentOrderStatus.Pending
            or OnlinePaymentOrderStatus.PendingVerification
            or OnlinePaymentOrderStatus.Cancelled
            or OnlinePaymentOrderStatus.Failed
        || (status == OnlinePaymentOrderStatus.Processing && IsProcessingStale(processingStartedAt, nowUtc));

    /// <summary>Only an unpaid attempt can be cancelled; a dismissed modal never undoes a recorded or in-flight payment.</summary>
    public static bool CanCancel(OnlinePaymentOrderStatus status) =>
        status is OnlinePaymentOrderStatus.Pending or OnlinePaymentOrderStatus.Failed;

    /// <summary>A payment still being confirmed must settle before another order is opened (prevents paying twice).</summary>
    public static bool BlocksNewOrder(OnlinePaymentOrderStatus status) =>
        status is OnlinePaymentOrderStatus.PendingVerification or OnlinePaymentOrderStatus.Processing;

    public static bool CanReuseOrder(
        OnlinePaymentOrderStatus status,
        decimal orderAmount,
        DateTime orderCreatedUtc,
        decimal outstanding,
        DateTime nowUtc) =>
        status == OnlinePaymentOrderStatus.Pending
        && ToPaise(orderAmount) == ToPaise(outstanding)
        && nowUtc - orderCreatedUtc <= OrderReuseWindow;

    public static bool NeedsReconciliation(OnlinePaymentOrderStatus status, DateTime orderCreatedUtc, DateTime nowUtc) =>
        status is OnlinePaymentOrderStatus.Pending
            or OnlinePaymentOrderStatus.PendingVerification
            or OnlinePaymentOrderStatus.Processing
            or OnlinePaymentOrderStatus.Cancelled
            or OnlinePaymentOrderStatus.Failed
        && nowUtc - orderCreatedUtc <= ReconcileWindow;

    public static bool IsFullSettlement(decimal amount, decimal outstanding) =>
        outstanding - amount <= AmountTolerance;

    public static OnlinePaymentDecision Decide(OnlinePaymentApplyContext ctx, GatewayPaymentSnapshot payment)
    {
        var samePayment = string.Equals(ctx.OrderGatewayPaymentId, payment.PaymentId, StringComparison.Ordinal);

        if (!string.IsNullOrEmpty(payment.OrderId)
            && !string.Equals(payment.OrderId, ctx.GatewayOrderId, StringComparison.Ordinal))
            return new(OnlinePaymentAction.Reject, Reasons.OrderMismatch);

        if (ctx.OrderStatus is OnlinePaymentOrderStatus.Completed or OnlinePaymentOrderStatus.ReviewRequired)
        {
            if (samePayment || ctx.OrderGatewayPaymentId == null)
                return new(OnlinePaymentAction.AlreadyApplied);
            return IsCaptured(payment)
                ? new(OnlinePaymentAction.DuplicateCapture, Reasons.SecondPaymentOnOrder)
                : new(OnlinePaymentAction.Ignore);
        }

        if (ctx.OrderStatus == OnlinePaymentOrderStatus.Processing && !ctx.ProcessingStale)
            return new(OnlinePaymentAction.InProgress);

        if (ctx.LedgerHasPayment)
            return new(OnlinePaymentAction.LinkExistingInstallment);

        var status = (payment.Status ?? string.Empty).Trim().ToLowerInvariant();
        switch (status)
        {
            case "captured":
                break;
            case "authorized":
            case "created":
            case "pending":
                return new(OnlinePaymentAction.AwaitCapture, Reasons.AwaitingCapture);
            case "failed":
                // A failed retry must not mask an earlier, different attempt that is awaiting capture.
                return ctx.OrderGatewayPaymentId == null || samePayment
                    ? new(OnlinePaymentAction.MarkFailed, Reasons.PaymentFailed)
                    : new(OnlinePaymentAction.Ignore);
            default:
                return new(OnlinePaymentAction.ReviewRequired, Reasons.GatewayStatusPrefix + status);
        }

        var captured = FromPaise(payment.AmountPaise);
        if (!string.Equals(payment.Currency ?? ctx.OrderCurrency, ctx.OrderCurrency, StringComparison.OrdinalIgnoreCase))
            return new(OnlinePaymentAction.ReviewRequired, Reasons.CurrencyMismatch, captured);
        if (payment.AmountPaise != ToPaise(ctx.OrderAmount))
            return new(OnlinePaymentAction.ReviewRequired, Reasons.AmountMismatch, captured);
        if (!ctx.BillingOpen)
            return new(OnlinePaymentAction.ReviewRequired, Reasons.BillingClosed, captured);
        if (captured - ctx.Outstanding > AmountTolerance)
            return new(OnlinePaymentAction.ReviewRequired, Reasons.Overpayment, captured);

        return new(OnlinePaymentAction.Record, null, captured);
    }

    private static bool IsCaptured(GatewayPaymentSnapshot payment) =>
        string.Equals(payment.Status?.Trim(), "captured", StringComparison.OrdinalIgnoreCase);

    public static MemberOnlinePaymentNeed ClassifyNeed(
        bool hasOpenBalance,
        bool billingOpen,
        MembershipStatus? latestMembershipStatus,
        DateTime? latestMembershipEndDate,
        DateTime? asOfUtc = null)
    {
        if (hasOpenBalance)
            return billingOpen ? MemberOnlinePaymentNeed.SettleOutstanding : MemberOnlinePaymentNeed.BillingClosed;
        if (latestMembershipStatus == null || UserMembershipRules.IsTerminalForReporting(latestMembershipStatus.Value))
            return MemberOnlinePaymentNeed.NothingDue;

        var today = (asOfUtc ?? DateTime.UtcNow).Date;
        if (latestMembershipStatus == MembershipStatus.Expired
            || (latestMembershipEndDate.HasValue && latestMembershipEndDate.Value.Date < today))
            return MemberOnlinePaymentNeed.RenewalRequired;
        return MemberOnlinePaymentNeed.NothingDue;
    }

    public static string ToApiStatus(OnlinePaymentOrderStatus status) => status switch
    {
        OnlinePaymentOrderStatus.Pending => "pending",
        OnlinePaymentOrderStatus.Completed => "completed",
        OnlinePaymentOrderStatus.Failed => "failed",
        OnlinePaymentOrderStatus.PendingVerification => "pending_verification",
        OnlinePaymentOrderStatus.Processing => "processing",
        OnlinePaymentOrderStatus.Cancelled => "cancelled",
        OnlinePaymentOrderStatus.ReviewRequired => "review_required",
        _ => status.ToString().ToLowerInvariant(),
    };

    public static string ToApiNeed(MemberOnlinePaymentNeed need) => need switch
    {
        MemberOnlinePaymentNeed.SettleOutstanding => "settle_outstanding",
        MemberOnlinePaymentNeed.RenewalRequired => "renewal_required",
        MemberOnlinePaymentNeed.BillingClosed => "billing_closed",
        _ => "nothing_due",
    };

    public static string DescribeStatus(OnlinePaymentOrderStatus status) => status switch
    {
        OnlinePaymentOrderStatus.Completed => "Payment recorded. Your outstanding balance has been updated.",
        OnlinePaymentOrderStatus.PendingVerification or OnlinePaymentOrderStatus.Processing =>
            "Payment received, confirming with the bank. This usually takes under a minute.",
        OnlinePaymentOrderStatus.ReviewRequired =>
            "Payment received but could not be applied automatically. The front desk will review it and refund or adjust as needed.",
        OnlinePaymentOrderStatus.Cancelled =>
            "Checkout was closed before the payment finished. If your bank or UPI app shows a deduction, it will be applied here automatically.",
        OnlinePaymentOrderStatus.Failed => "The payment attempt failed. No money was taken; you can try again.",
        _ => "Waiting for checkout to finish.",
    };

    public static string DescribeNeed(MemberOnlinePaymentNeed need) => need switch
    {
        MemberOnlinePaymentNeed.SettleOutstanding => "You have an outstanding balance on your current membership bill.",
        MemberOnlinePaymentNeed.RenewalRequired =>
            "Your membership period has ended. Renewals are set up at reception; once the new period is added you can pay its balance here.",
        MemberOnlinePaymentNeed.BillingClosed =>
            "This membership's billing is closed. Please contact the front desk.",
        _ => "You have no outstanding membership balance.",
    };
}
