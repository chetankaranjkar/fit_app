using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>
    /// Member online settlement of an existing billing header via Razorpay. Amounts always come from the server-side
    /// outstanding balance; a gateway payment is applied at most once (order claim + ledger reference check), and
    /// captures that miss the client verify are picked up by webhook, status checks, or the reconciliation sweep.
    /// </summary>
    public sealed class RazorpayOnlinePaymentService : IOnlinePaymentService
    {
        private static readonly TimeSpan StatusCheckThrottle = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan SweepRecheckAfter = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan SweepMinimumAge = TimeSpan.FromMinutes(2);
        private static readonly TimeSpan UnpaidOrderExpiresAfter = TimeSpan.FromHours(24);
        private const int SweepBatchSize = 50;

        private static readonly OnlinePaymentOrderStatus[] OpenStatuses =
        {
            OnlinePaymentOrderStatus.Pending,
            OnlinePaymentOrderStatus.PendingVerification,
            OnlinePaymentOrderStatus.Processing,
            OnlinePaymentOrderStatus.Cancelled,
            OnlinePaymentOrderStatus.Failed,
        };

        private readonly ApplicationDbContext _db;
        private readonly IMembershipPaymentService _membershipPaymentService;
        private readonly IBillingCalculationService _billing;
        private readonly IRazorpayGatewayClient _gateway;
        private readonly IFinancialAuditService _audit;
        private readonly CommercialOptions _options;
        private readonly ILogger<RazorpayOnlinePaymentService> _logger;

        public RazorpayOnlinePaymentService(
            ApplicationDbContext db,
            IMembershipPaymentService membershipPaymentService,
            IBillingCalculationService billing,
            IRazorpayGatewayClient gateway,
            IFinancialAuditService audit,
            IOptions<CommercialOptions> options,
            ILogger<RazorpayOnlinePaymentService> logger)
        {
            _db = db;
            _membershipPaymentService = membershipPaymentService;
            _billing = billing;
            _gateway = gateway;
            _audit = audit;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(
            int userId,
            CreateRazorpayOrderRequestDto request,
            CancellationToken cancellationToken = default)
        {
            EnsureOnlinePaymentsEnabled();

            var inFlight = await _db.OnlinePaymentOrders
                .Where(o => o.UserId == userId
                    && (o.Status == OnlinePaymentOrderStatus.PendingVerification
                        || o.Status == OnlinePaymentOrderStatus.Processing))
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            foreach (var attempt in inFlight)
            {
                await ReconcileIfDueAsync(attempt, cancellationToken).ConfigureAwait(false);
                if (RazorpayPaymentRules.BlocksNewOrder(attempt.Status))
                    throw new ConflictException(
                        "Your previous payment is still being confirmed. Check its status before paying again.");
            }

            var header = await ResolveOpenHeaderAsync(userId, request.MembershipPaymentId, cancellationToken)
                .ConfigureAwait(false);
            if (!UserMembershipRules.AllowsPaymentCollection(header.Membership.Status))
                throw new InvalidOperationException(UserMembershipRules.PaymentCollectionClosedMessage);

            var outstanding = header.PendingAmount;
            if (outstanding <= 0)
                throw new InvalidOperationException("No pending balance to pay online.");
            var amountPaise = RazorpayPaymentRules.ToPaise(outstanding);
            if (amountPaise <= 0)
                throw new InvalidOperationException("Payment amount is too small.");

            var user = await _db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken)
                .ConfigureAwait(false)
                ?? throw new KeyNotFoundException("Member profile not found.");
            var authEmail = await _db.AuthUsers.AsNoTracking()
                .Where(a => a.UserId == userId)
                .Select(a => a.Email)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);

            var now = DateTime.UtcNow;
            var pendingForHeader = await _db.OnlinePaymentOrders
                .Where(o => o.MembershipPaymentId == header.Id
                    && o.UserId == userId
                    && o.Status == OnlinePaymentOrderStatus.Pending)
                .OrderByDescending(o => o.CreatedDate)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            var reusable = pendingForHeader.FirstOrDefault(o =>
                RazorpayPaymentRules.CanReuseOrder(o.Status, o.Amount, o.CreatedDate, outstanding, now));
            if (reusable != null)
                return BuildOrderResponse(reusable, user, authEmail);

            foreach (var stale in pendingForHeader)
            {
                stale.Status = OnlinePaymentOrderStatus.Cancelled;
                stale.StatusReason = RazorpayPaymentRules.Reasons.Superseded;
                stale.UpdatedDate = now;
            }

            string gatewayOrderId;
            try
            {
                gatewayOrderId = await _gateway.CreateOrderAsync(
                    amountPaise,
                    RazorpayPaymentRules.SupportedCurrency,
                    $"mp-{header.Id}-{now:yyyyMMddHHmmss}",
                    new Dictionary<string, string>
                    {
                        ["membershipPaymentId"] = header.Id.ToString(),
                        ["userId"] = userId.ToString(),
                    },
                    cancellationToken).ConfigureAwait(false);
            }
            catch (RazorpayGatewayUnavailableException)
            {
                throw new InvalidOperationException("Could not reach the payment gateway. Try again in a moment.");
            }

            var tracked = new OnlinePaymentOrder
            {
                MembershipPaymentId = header.Id,
                UserId = userId,
                GatewayOrderId = gatewayOrderId,
                Amount = RazorpayPaymentRules.FromPaise(amountPaise),
                Currency = RazorpayPaymentRules.SupportedCurrency,
                Status = OnlinePaymentOrderStatus.Pending,
                CreatedDate = now,
            };
            _db.OnlinePaymentOrders.Add(tracked);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return BuildOrderResponse(tracked, user, authEmail);
        }

        public async Task<RazorpayVerifyResponseDto> VerifyRazorpayPaymentAsync(
            int userId,
            RazorpayVerifyRequestDto request,
            CancellationToken cancellationToken = default)
        {
            EnsureOnlinePaymentsEnabled();

            if (string.IsNullOrWhiteSpace(request.RazorpayOrderId)
                || string.IsNullOrWhiteSpace(request.RazorpayPaymentId)
                || string.IsNullOrWhiteSpace(request.RazorpaySignature))
            {
                throw new ArgumentException("Payment verification details are incomplete.");
            }

            var orderId = request.RazorpayOrderId.Trim();
            var paymentId = request.RazorpayPaymentId.Trim();
            if (!RazorpayPaymentRules.IsValidCheckoutSignature(
                    orderId, paymentId, request.RazorpaySignature, _options.RazorpayKeySecret!))
            {
                _logger.LogWarning(
                    "Razorpay signature mismatch for order {OrderId} payment {PaymentId} user {UserId}",
                    orderId, paymentId, userId);
                throw new ArgumentException("Payment signature verification failed.");
            }

            var order = await FindMemberOrderAsync(userId, orderId, cancellationToken).ConfigureAwait(false);
            if (order.Status is OnlinePaymentOrderStatus.Completed or OnlinePaymentOrderStatus.ReviewRequired
                && order.GatewayPaymentId == paymentId)
                return await BuildVerifyResponseAsync(order, cancellationToken).ConfigureAwait(false);

            GatewayPaymentSnapshot? payment = null;
            try
            {
                payment = await _gateway.FetchPaymentAsync(paymentId, cancellationToken).ConfigureAwait(false);
            }
            catch (RazorpayGatewayUnavailableException ex)
            {
                _logger.LogWarning(ex, "Razorpay payment fetch failed during verify for order {OrderId}", orderId);
            }

            if (payment == null)
            {
                await MarkPendingVerificationAsync(
                    order, paymentId, RazorpayPaymentRules.Reasons.GatewayUnreachable, cancellationToken)
                    .ConfigureAwait(false);
            }
            else
            {
                await ApplyGatewayPaymentAsync(order, payment, "verify", cancellationToken).ConfigureAwait(false);
            }

            return await BuildVerifyResponseAsync(order, cancellationToken).ConfigureAwait(false);
        }

        public async Task<OnlinePaymentAttemptDto> CancelRazorpayOrderAsync(
            int userId,
            string gatewayOrderId,
            CancellationToken cancellationToken = default)
        {
            var order = await FindMemberOrderAsync(userId, gatewayOrderId, cancellationToken).ConfigureAwait(false);
            if (RazorpayPaymentRules.CanCancel(order.Status))
            {
                var now = DateTime.UtcNow;
                await _db.OnlinePaymentOrders
                    .Where(o => o.Id == order.Id
                        && (o.Status == OnlinePaymentOrderStatus.Pending || o.Status == OnlinePaymentOrderStatus.Failed))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(o => o.Status, OnlinePaymentOrderStatus.Cancelled)
                        .SetProperty(o => o.StatusReason, RazorpayPaymentRules.Reasons.CheckoutDismissed)
                        .SetProperty(o => o.UpdatedDate, now),
                        cancellationToken)
                    .ConfigureAwait(false);
                await _db.Entry(order).ReloadAsync(cancellationToken).ConfigureAwait(false);
            }

            return ToAttemptDto(order);
        }

        public async Task<OnlinePaymentAttemptDto> GetRazorpayOrderStatusAsync(
            int userId,
            string gatewayOrderId,
            CancellationToken cancellationToken = default)
        {
            var order = await FindMemberOrderAsync(userId, gatewayOrderId, cancellationToken).ConfigureAwait(false);
            await ReconcileIfDueAsync(order, cancellationToken).ConfigureAwait(false);
            return ToAttemptDto(order);
        }

        public async Task<MemberOnlinePaymentSummaryDto> GetMemberOnlinePaymentSummaryAsync(
            int userId,
            CancellationToken cancellationToken = default)
        {
            var enabled = _options.EnableOnlinePayments && _options.IsRazorpayConfigured;
            var now = DateTime.UtcNow;

            var latestAttempt = await _db.OnlinePaymentOrders
                .Where(o => o.UserId == userId && o.CreatedDate >= now - RazorpayPaymentRules.ReconcileWindow)
                .OrderByDescending(o => o.CreatedDate)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);
            if (latestAttempt != null && enabled)
                await ReconcileIfDueAsync(latestAttempt, cancellationToken).ConfigureAwait(false);

            var openHeaders = await _db.MembershipPayments.AsNoTracking()
                .Include(p => p.Membership)
                .ThenInclude(m => m.Plan)
                .Where(p => p.UserId == userId
                    && !p.IsDeleted
                    && p.PaymentStatus != MembershipPaymentStatus.Paid
                    && p.PendingAmount > 0)
                .OrderByDescending(p => p.CreatedDate)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            var header = openHeaders.FirstOrDefault(h => UserMembershipRules.AllowsPaymentCollection(h.Membership.Status))
                ?? openHeaders.FirstOrDefault();
            if (header != null)
                await RecalculateFromLedgerAsync(header, cancellationToken).ConfigureAwait(false);

            var latestMembership = await _db.UserMemberships.AsNoTracking()
                .Include(m => m.Plan)
                .Where(m => m.UserId == userId && !m.IsDeleted)
                .OrderByDescending(m => m.EndDate)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);

            var hasOpenBalance = header != null && header.PendingAmount > RazorpayPaymentRules.AmountTolerance;
            var billingOpen = header != null && UserMembershipRules.AllowsPaymentCollection(header.Membership.Status);
            var need = RazorpayPaymentRules.ClassifyNeed(
                hasOpenBalance,
                billingOpen,
                latestMembership?.Status,
                latestMembership?.EndDate,
                now);
            var membership = need is MemberOnlinePaymentNeed.SettleOutstanding or MemberOnlinePaymentNeed.BillingClosed
                ? header!.Membership
                : latestMembership;

            return new MemberOnlinePaymentSummaryDto
            {
                OnlinePaymentsEnabled = enabled,
                PaymentNeed = RazorpayPaymentRules.ToApiNeed(need),
                Message = RazorpayPaymentRules.DescribeNeed(need),
                MembershipPaymentId = hasOpenBalance ? header!.Id : null,
                OutstandingAmount = hasOpenBalance ? header!.PendingAmount : 0,
                NextDueDate = hasOpenBalance ? header!.NextDueDate : null,
                PlanName = membership?.Plan?.PlanName,
                MembershipStatus = membership?.Status.ToString(),
                MembershipEndDate = membership?.EndDate,
                LatestAttempt = latestAttempt == null ? null : ToAttemptDto(latestAttempt),
            };
        }

        public async Task<RazorpayWebhookResultDto> HandleRazorpayWebhookAsync(
            byte[] rawBody,
            string? signature,
            CancellationToken cancellationToken = default)
        {
            if (!_options.IsRazorpayWebhookConfigured)
                throw new InvalidOperationException("Razorpay webhook is not configured.");
            if (!RazorpayPaymentRules.IsValidWebhookSignature(rawBody, signature, _options.RazorpayWebhookSecret!))
                throw new UnauthorizedAccessException("Webhook signature verification failed.");

            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;
            var eventName = root.TryGetProperty("event", out var ev) ? ev.GetString() : null;
            if (eventName is not ("payment.captured" or "payment.authorized" or "payment.failed" or "order.paid"))
                return new RazorpayWebhookResultDto { Handled = false, Message = $"Ignored event {eventName}." };

            GatewayPaymentSnapshot? payment = null;
            if (root.TryGetProperty("payload", out var payload)
                && payload.TryGetProperty("payment", out var paymentNode)
                && paymentNode.TryGetProperty("entity", out var entity))
            {
                payment = RazorpayGatewayClient.ParsePayment(entity);
            }

            if (payment == null || string.IsNullOrWhiteSpace(payment.OrderId))
                return new RazorpayWebhookResultDto { Handled = false, Message = "No order-linked payment in payload." };

            var order = await _db.OnlinePaymentOrders
                .FirstOrDefaultAsync(o => o.GatewayOrderId == payment.OrderId, cancellationToken)
                .ConfigureAwait(false);
            if (order == null)
            {
                _logger.LogWarning("Razorpay webhook {Event} for unknown order {OrderId}", eventName, payment.OrderId);
                return new RazorpayWebhookResultDto { Handled = false, Message = "Unknown order." };
            }

            await ApplyGatewayPaymentAsync(order, payment, "webhook", cancellationToken).ConfigureAwait(false);
            return new RazorpayWebhookResultDto
            {
                Handled = true,
                Message = RazorpayPaymentRules.ToApiStatus(order.Status),
            };
        }

        public async Task<int> ReconcileOpenOrdersAsync(CancellationToken cancellationToken = default)
        {
            if (!_options.EnableOnlinePayments || !_options.IsRazorpayConfigured)
                return 0;

            var now = DateTime.UtcNow;
            var createdAfter = now - RazorpayPaymentRules.ReconcileWindow;
            var createdBefore = now - SweepMinimumAge;
            var checkedBefore = now - SweepRecheckAfter;
            var candidates = await _db.OnlinePaymentOrders
                .Where(o => OpenStatuses.Contains(o.Status)
                    && o.CreatedDate >= createdAfter
                    && o.CreatedDate <= createdBefore
                    && (o.LastCheckedAt == null || o.LastCheckedAt <= checkedBefore))
                .OrderBy(o => o.CreatedDate)
                .Take(SweepBatchSize)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            var changed = 0;
            foreach (var order in candidates)
            {
                var before = order.Status;
                try
                {
                    await ReconcileOrderAsync(order, cancellationToken).ConfigureAwait(false);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Reconciliation failed for Razorpay order {OrderId}", order.GatewayOrderId);
                }

                if (order.Status != before)
                    changed++;
            }

            return changed;
        }

        private async Task ReconcileIfDueAsync(OnlinePaymentOrder order, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            if (order.LastCheckedAt.HasValue && now - order.LastCheckedAt.Value < StatusCheckThrottle)
                return;
            try
            {
                await ReconcileOrderAsync(order, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Status check failed for Razorpay order {OrderId}", order.GatewayOrderId);
            }
        }

        /// <summary>Pulls the order's payments from Razorpay and applies the outcome. Gateway outages leave state unchanged.</summary>
        private async Task ReconcileOrderAsync(OnlinePaymentOrder order, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            if (!RazorpayPaymentRules.NeedsReconciliation(order.Status, order.CreatedDate, now))
                return;

            IReadOnlyList<GatewayPaymentSnapshot> payments;
            try
            {
                payments = await _gateway.FetchOrderPaymentsAsync(order.GatewayOrderId, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (RazorpayGatewayUnavailableException ex)
            {
                _logger.LogWarning(ex, "Could not reconcile Razorpay order {OrderId}", order.GatewayOrderId);
                return;
            }

            await _db.OnlinePaymentOrders
                .Where(o => o.Id == order.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.LastCheckedAt, now), cancellationToken)
                .ConfigureAwait(false);
            await _db.Entry(order).ReloadAsync(cancellationToken).ConfigureAwait(false);

            static bool Is(GatewayPaymentSnapshot p, string status) =>
                string.Equals(p.Status, status, StringComparison.OrdinalIgnoreCase);

            var captured = payments
                .Where(p => Is(p, "captured"))
                .OrderByDescending(p => p.PaymentId == order.GatewayPaymentId)
                .ToList();
            if (captured.Count > 0)
            {
                foreach (var p in captured)
                    await ApplyGatewayPaymentAsync(order, p, "reconcile", cancellationToken).ConfigureAwait(false);
                return;
            }

            var authorized = payments.FirstOrDefault(p => Is(p, "authorized"));
            if (authorized != null)
            {
                await ApplyGatewayPaymentAsync(order, authorized, "reconcile", cancellationToken).ConfigureAwait(false);
                return;
            }

            if (payments.Count > 0 && payments.All(p => Is(p, "failed")) && order.Status == OnlinePaymentOrderStatus.Pending)
            {
                await ApplyGatewayPaymentAsync(order, payments[^1], "reconcile", cancellationToken).ConfigureAwait(false);
                return;
            }

            if (payments.Count == 0
                && order.Status == OnlinePaymentOrderStatus.Pending
                && now - order.CreatedDate >= UnpaidOrderExpiresAfter)
            {
                await UpdateOrderAsync(order, o =>
                {
                    o.Status = OnlinePaymentOrderStatus.Cancelled;
                    o.StatusReason = RazorpayPaymentRules.Reasons.Expired;
                }, cancellationToken).ConfigureAwait(false);
            }
        }

        /// <summary>Single entry point for verify, webhook, and reconciliation. Safe to call repeatedly for the same payment.</summary>
        private async Task ApplyGatewayPaymentAsync(
            OnlinePaymentOrder order,
            GatewayPaymentSnapshot payment,
            string source,
            CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var observed = order.Status;
            var decision = RazorpayPaymentRules.Decide(
                await BuildContextAsync(order, payment.PaymentId, observed, now, cancellationToken).ConfigureAwait(false),
                payment);

            switch (decision.Action)
            {
                case OnlinePaymentAction.AlreadyApplied:
                case OnlinePaymentAction.InProgress:
                case OnlinePaymentAction.Ignore:
                    return;
                case OnlinePaymentAction.Reject:
                    _logger.LogWarning(
                        "Razorpay payment {PaymentId} ({PaymentOrder}) does not belong to order {OrderId}",
                        payment.PaymentId, payment.OrderId, order.GatewayOrderId);
                    return;
                case OnlinePaymentAction.DuplicateCapture:
                    _logger.LogWarning(
                        "Second captured payment {PaymentId} on settled Razorpay order {OrderId}; refund required",
                        payment.PaymentId, order.GatewayOrderId);
                    await AuditAsync(order, "online_payment_duplicate_capture", payment, decision, source, cancellationToken)
                        .ConfigureAwait(false);
                    return;
                case OnlinePaymentAction.AwaitCapture:
                    await MarkPendingVerificationAsync(order, payment.PaymentId, decision.Reason, cancellationToken)
                        .ConfigureAwait(false);
                    return;
                case OnlinePaymentAction.MarkFailed:
                    if (order.Status != OnlinePaymentOrderStatus.Processing)
                    {
                        await UpdateOrderAsync(order, o =>
                        {
                            o.Status = OnlinePaymentOrderStatus.Failed;
                            o.StatusReason = decision.Reason;
                            o.GatewayPaymentId = payment.PaymentId;
                        }, cancellationToken).ConfigureAwait(false);
                    }
                    return;
            }

            if (!await TryClaimAsync(order, observed, now, cancellationToken).ConfigureAwait(false))
            {
                await _db.Entry(order).ReloadAsync(cancellationToken).ConfigureAwait(false);
                return;
            }

            // Re-decide under the claim: staff may have collected cash or another request recorded meanwhile.
            var claimedContext = await BuildContextAsync(order, payment.PaymentId, observed, now, cancellationToken)
                .ConfigureAwait(false);
            decision = RazorpayPaymentRules.Decide(claimedContext, payment);

            switch (decision.Action)
            {
                case OnlinePaymentAction.LinkExistingInstallment:
                    await CompleteAsync(order, payment, cancellationToken).ConfigureAwait(false);
                    return;
                case OnlinePaymentAction.ReviewRequired:
                    await FlagForReviewAsync(order, payment, decision, source, cancellationToken).ConfigureAwait(false);
                    return;
                case OnlinePaymentAction.Record:
                    break;
                default:
                    await UpdateOrderAsync(order, o =>
                    {
                        o.Status = observed;
                        o.ProcessingStartedAt = null;
                    }, cancellationToken).ConfigureAwait(false);
                    return;
            }

            try
            {
                var fullSettlement = RazorpayPaymentRules.IsFullSettlement(decision.Amount, claimedContext.Outstanding);
                DateTime? nextDue = null;
                if (!fullSettlement)
                {
                    nextDue = await _db.MembershipPayments.AsNoTracking()
                        .Where(p => p.Id == order.MembershipPaymentId)
                        .Select(p => p.NextDueDate)
                        .FirstOrDefaultAsync(cancellationToken)
                        .ConfigureAwait(false) ?? now.Date;
                }

                await _membershipPaymentService.RecordInstallmentAsync(
                    order.MembershipPaymentId,
                    new RecordMembershipPaymentInstallmentDto
                    {
                        Amount = decision.Amount,
                        Method = MembershipPaymentMethod.Online,
                        ReferenceNumber = payment.PaymentId,
                        TransactionDate = now,
                        NextDueDate = nextDue,
                        Remarks = $"Razorpay order {order.GatewayOrderId} ({source})",
                    },
                    staffUserId: null,
                    cancellationToken).ConfigureAwait(false);
            }
            catch (DomainException ex)
            {
                ResetTrackerKeeping(order);
                await FlagForReviewAsync(
                    order,
                    payment,
                    new OnlinePaymentDecision(
                        OnlinePaymentAction.ReviewRequired,
                        RazorpayPaymentRules.Reasons.RecordingFailed,
                        decision.Amount),
                    source,
                    cancellationToken,
                    ex.Message).ConfigureAwait(false);
                return;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Recording Razorpay payment {PaymentId} failed; left for reconciliation", payment.PaymentId);
                ResetTrackerKeeping(order);
                await MarkPendingVerificationAsync(
                    order, payment.PaymentId, RazorpayPaymentRules.Reasons.RecordingFailed, cancellationToken)
                    .ConfigureAwait(false);
                return;
            }

            await CompleteAsync(order, payment, cancellationToken).ConfigureAwait(false);
            _logger.LogInformation(
                "Recorded online membership payment {MembershipPaymentId} for user {UserId} via Razorpay {GatewayPaymentId} ({Source})",
                order.MembershipPaymentId, order.UserId, payment.PaymentId, source);
        }

        private async Task<OnlinePaymentApplyContext> BuildContextAsync(
            OnlinePaymentOrder order,
            string paymentId,
            OnlinePaymentOrderStatus observedStatus,
            DateTime now,
            CancellationToken cancellationToken)
        {
            var header = await _db.MembershipPayments.AsNoTracking()
                .Include(p => p.Membership)
                .FirstOrDefaultAsync(p => p.Id == order.MembershipPaymentId && !p.IsDeleted, cancellationToken)
                .ConfigureAwait(false);
            var transactions = await _db.MembershipPaymentTransactions.AsNoTracking()
                .Where(t => t.PaymentId == order.MembershipPaymentId && !t.IsDeleted)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            var outstanding = 0m;
            if (header != null)
            {
                _billing.RecalculateHeader(header, transactions);
                outstanding = header.PendingAmount;
            }

            return new OnlinePaymentApplyContext(
                observedStatus,
                order.GatewayOrderId,
                order.GatewayPaymentId,
                order.Amount,
                order.Currency,
                LedgerHasPayment: transactions.Any(t =>
                    t.TransactionMethod == MembershipPaymentMethod.Online && t.ReferenceNumber == paymentId),
                BillingOpen: header?.Membership != null
                    && UserMembershipRules.AllowsPaymentCollection(header.Membership.Status),
                Outstanding: outstanding,
                ProcessingStale: RazorpayPaymentRules.IsProcessingStale(order.ProcessingStartedAt, now));
        }

        private async Task<bool> TryClaimAsync(
            OnlinePaymentOrder order,
            OnlinePaymentOrderStatus observed,
            DateTime now,
            CancellationToken cancellationToken)
        {
            if (!RazorpayPaymentRules.IsClaimable(observed, order.ProcessingStartedAt, now))
                return false;

            var staleBefore = now - RazorpayPaymentRules.ProcessingStaleAfter;
            var query = _db.OnlinePaymentOrders.Where(o => o.Id == order.Id && o.Status == observed);
            if (observed == OnlinePaymentOrderStatus.Processing)
                query = query.Where(o => o.ProcessingStartedAt == null || o.ProcessingStartedAt <= staleBefore);

            var rows = await query
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.Status, OnlinePaymentOrderStatus.Processing)
                    .SetProperty(o => o.ProcessingStartedAt, now)
                    .SetProperty(o => o.UpdatedDate, now),
                    cancellationToken)
                .ConfigureAwait(false);
            if (rows == 1)
                await _db.Entry(order).ReloadAsync(cancellationToken).ConfigureAwait(false);
            return rows == 1;
        }

        private async Task CompleteAsync(
            OnlinePaymentOrder order,
            GatewayPaymentSnapshot payment,
            CancellationToken cancellationToken)
        {
            var transactionId = await _db.MembershipPaymentTransactions.AsNoTracking()
                .Where(t => t.PaymentId == order.MembershipPaymentId
                    && t.TransactionMethod == MembershipPaymentMethod.Online
                    && t.ReferenceNumber == payment.PaymentId)
                .Select(t => (int?)t.Id)
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);

            await UpdateOrderAsync(order, o =>
            {
                o.Status = OnlinePaymentOrderStatus.Completed;
                o.StatusReason = null;
                o.GatewayPaymentId = payment.PaymentId;
                o.CapturedAmount = RazorpayPaymentRules.FromPaise(payment.AmountPaise);
                o.MembershipPaymentTransactionId = transactionId;
            }, cancellationToken).ConfigureAwait(false);
        }

        private async Task FlagForReviewAsync(
            OnlinePaymentOrder order,
            GatewayPaymentSnapshot payment,
            OnlinePaymentDecision decision,
            string source,
            CancellationToken cancellationToken,
            string? detail = null)
        {
            await UpdateOrderAsync(order, o =>
            {
                o.Status = OnlinePaymentOrderStatus.ReviewRequired;
                o.StatusReason = Truncate(detail == null ? decision.Reason : $"{decision.Reason}: {detail}", 300);
                o.GatewayPaymentId = payment.PaymentId;
                o.CapturedAmount = RazorpayPaymentRules.FromPaise(payment.AmountPaise);
            }, cancellationToken).ConfigureAwait(false);

            _logger.LogWarning(
                "Razorpay payment {PaymentId} on order {OrderId} needs review: {Reason}",
                payment.PaymentId, order.GatewayOrderId, order.StatusReason);
            await AuditAsync(order, "online_payment_review_required", payment, decision, source, cancellationToken)
                .ConfigureAwait(false);
        }

        private async Task AuditAsync(
            OnlinePaymentOrder order,
            string action,
            GatewayPaymentSnapshot payment,
            OnlinePaymentDecision decision,
            string source,
            CancellationToken cancellationToken)
        {
            var details = JsonSerializer.Serialize(new
            {
                gatewayOrderId = order.GatewayOrderId,
                gatewayPaymentId = payment.PaymentId,
                capturedAmount = RazorpayPaymentRules.FromPaise(payment.AmountPaise),
                orderAmount = order.Amount,
                reason = decision.Reason,
                source,
            });
            await _audit.LogAsync(
                nameof(OnlinePaymentOrder),
                order.Id,
                action,
                actorUserId: null,
                order.MembershipPaymentId,
                order.UserId,
                details,
                cancellationToken).ConfigureAwait(false);
        }

        private Task MarkPendingVerificationAsync(
            OnlinePaymentOrder order,
            string paymentId,
            string? reason,
            CancellationToken cancellationToken)
        {
            if (order.Status is OnlinePaymentOrderStatus.Completed or OnlinePaymentOrderStatus.ReviewRequired)
                return Task.CompletedTask;
            return UpdateOrderAsync(order, o =>
            {
                o.Status = OnlinePaymentOrderStatus.PendingVerification;
                o.StatusReason = reason;
                o.GatewayPaymentId = paymentId;
                o.ProcessingStartedAt = null;
            }, cancellationToken);
        }

        /// <summary>A failed installment leaves rolled-back rows tracked; drop them so the next SaveChanges cannot persist them.</summary>
        private void ResetTrackerKeeping(OnlinePaymentOrder order)
        {
            _db.ChangeTracker.Clear();
            // Attach only the order: its MembershipPayment graph may still reference the rolled-back installment.
            order.MembershipPayment = null!;
            _db.Entry(order).State = EntityState.Unchanged;
        }

        private async Task UpdateOrderAsync(
            OnlinePaymentOrder order,
            Action<OnlinePaymentOrder> mutate,
            CancellationToken cancellationToken)
        {
            await _db.Entry(order).ReloadAsync(cancellationToken).ConfigureAwait(false);
            mutate(order);
            order.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        private async Task<RazorpayVerifyResponseDto> BuildVerifyResponseAsync(
            OnlinePaymentOrder order,
            CancellationToken cancellationToken)
        {
            var completed = order.Status == OnlinePaymentOrderStatus.Completed;
            MembershipPaymentDto? payment = null;
            if (completed)
            {
                payment = (await _membershipPaymentService
                        .GetByUserIdAsync(order.UserId, cancellationToken)
                        .ConfigureAwait(false))
                    .FirstOrDefault(p => p.Id == order.MembershipPaymentId);
            }

            return new RazorpayVerifyResponseDto
            {
                Success = completed,
                Status = RazorpayPaymentRules.ToApiStatus(order.Status),
                Message = RazorpayPaymentRules.DescribeStatus(order.Status),
                OrderId = order.GatewayOrderId,
                Payment = payment,
            };
        }

        private async Task<OnlinePaymentOrder> FindMemberOrderAsync(
            int userId,
            string gatewayOrderId,
            CancellationToken cancellationToken)
        {
            var id = (gatewayOrderId ?? string.Empty).Trim();
            return await _db.OnlinePaymentOrders
                .FirstOrDefaultAsync(o => o.GatewayOrderId == id && o.UserId == userId && !o.IsDeleted, cancellationToken)
                .ConfigureAwait(false)
                ?? throw new KeyNotFoundException("Online payment order not found.");
        }

        private async Task<MembershipPayment> ResolveOpenHeaderAsync(
            int userId,
            int? membershipPaymentId,
            CancellationToken cancellationToken)
        {
            var query = _db.MembershipPayments.AsNoTracking()
                .Include(p => p.Membership)
                .Where(p => p.UserId == userId && !p.IsDeleted);

            MembershipPayment? header;
            if (membershipPaymentId is > 0)
            {
                header = await query.FirstOrDefaultAsync(p => p.Id == membershipPaymentId.Value, cancellationToken)
                    .ConfigureAwait(false);
            }
            else
            {
                var open = await query
                    .Where(p => p.PaymentStatus != MembershipPaymentStatus.Paid && p.PendingAmount > 0)
                    .OrderByDescending(p => p.CreatedDate)
                    .ToListAsync(cancellationToken)
                    .ConfigureAwait(false);
                header = open.FirstOrDefault(p => UserMembershipRules.AllowsPaymentCollection(p.Membership.Status))
                    ?? open.FirstOrDefault();
            }

            if (header == null)
                throw new KeyNotFoundException(
                    "No outstanding membership balance was found. Membership renewals are set up at reception.");

            await RecalculateFromLedgerAsync(header, cancellationToken).ConfigureAwait(false);
            return header;
        }

        private async Task RecalculateFromLedgerAsync(MembershipPayment header, CancellationToken cancellationToken)
        {
            var transactions = await _db.MembershipPaymentTransactions.AsNoTracking()
                .Where(t => t.PaymentId == header.Id && !t.IsDeleted)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            _billing.RecalculateHeader(header, transactions);
        }

        private RazorpayOrderResponseDto BuildOrderResponse(OnlinePaymentOrder order, User user, string? email) => new()
        {
            OrderId = order.GatewayOrderId,
            KeyId = _options.RazorpayKeyId!.Trim(),
            AmountPaise = RazorpayPaymentRules.ToPaise(order.Amount),
            Amount = order.Amount,
            Currency = order.Currency,
            MembershipPaymentId = order.MembershipPaymentId,
            BusinessName = _options.CheckoutBusinessName,
            MemberEmail = email,
            MemberPhone = user.Phone,
            MemberName = $"{user.FirstName} {user.LastName}".Trim(),
        };

        private static OnlinePaymentAttemptDto ToAttemptDto(OnlinePaymentOrder order) => new()
        {
            OrderId = order.GatewayOrderId,
            MembershipPaymentId = order.MembershipPaymentId,
            Status = RazorpayPaymentRules.ToApiStatus(order.Status),
            Message = RazorpayPaymentRules.DescribeStatus(order.Status),
            Amount = order.Amount,
            CapturedAmount = order.CapturedAmount,
            CreatedDate = order.CreatedDate,
            UpdatedDate = order.UpdatedDate,
        };

        private void EnsureOnlinePaymentsEnabled()
        {
            if (!_options.EnableOnlinePayments)
                throw new InvalidOperationException("Online payments are not enabled for this gym.");
            if (!_options.IsRazorpayConfigured)
                throw new InvalidOperationException("Razorpay is not configured.");
        }

        private static string? Truncate(string? value, int max) =>
            value == null || value.Length <= max ? value : value[..max];
    }
}
