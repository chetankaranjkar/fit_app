using System.Reflection;
using System.Text;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace GymManagement.Core.Tests;

/// <summary>Duplicate processing and interrupted checkout against a real (SQLite) order/ledger store.</summary>
public sealed class RazorpayOnlinePaymentServiceTests : IAsyncLifetime
{
    private const string KeySecret = "rzp_test_secret";
    private const string WebhookSecret = "whsec_test";
    private const int MemberId = 1;

    private SqliteConnection _connection = null!;
    private RazorpayTestContext _db = null!;
    private readonly FakeGateway _gateway = new();
    private readonly FakeAudit _audit = new();
    private FakeLedger _ledger = null!;
    private RazorpayOnlinePaymentService _service = null!;
    private int _headerId;
    private int _membershipId;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        await _connection.OpenAsync();
        _db = new RazorpayTestContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();

        _db.Users.Add(new User { Id = MemberId, FirstName = "Asha", LastName = "Rao", Phone = "9876543210" });
        _db.MembershipPlans.Add(new MembershipPlan { Id = 1, PlanName = "Quarterly", DurationDays = 90, Price = 1500m });
        var membership = new UserMembership
        {
            UserId = MemberId,
            PlanId = 1,
            StartDate = new DateTime(2026, 10, 1),
            EndDate = new DateTime(2026, 12, 31),
            Status = MembershipStatus.ActivePendingPayment,
        };
        _db.UserMemberships.Add(membership);
        await _db.SaveChangesAsync();
        var header = new MembershipPayment
        {
            PaymentNumber = "MP-1",
            UserId = MemberId,
            MembershipId = membership.Id,
            TotalAmount = 1500m,
            OriginalAmount = 1500m,
            FinalBillAmount = 1500m,
            PendingAmount = 1500m,
            PaymentStatus = MembershipPaymentStatus.Pending,
        };
        _db.MembershipPayments.Add(header);
        await _db.SaveChangesAsync();
        _headerId = header.Id;
        _membershipId = membership.Id;

        _ledger = DispatchProxy.Create<IMembershipPaymentService, FakeLedger>() as FakeLedger
            ?? throw new InvalidOperationException();
        _ledger.Db = _db;
        _service = new RazorpayOnlinePaymentService(
            _db,
            (IMembershipPaymentService)(object)_ledger,
            new BillingCalculationService(),
            _gateway,
            _audit,
            Microsoft.Extensions.Options.Options.Create(new CommercialOptions
            {
                EnableOnlinePayments = true,
                RazorpayKeyId = "rzp_test_key",
                RazorpayKeySecret = KeySecret,
                RazorpayWebhookSecret = WebhookSecret,
            }),
            NullLogger<RazorpayOnlinePaymentService>.Instance);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task Order_amount_comes_from_server_outstanding_and_is_reused_on_double_open()
    {
        var first = await _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto());
        var second = await _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto());

        Assert.Equal(150000, first.AmountPaise);
        Assert.Equal(first.OrderId, second.OrderId);
        Assert.Equal(1, _gateway.OrdersCreated);
    }

    [Fact]
    public async Task Changed_outstanding_supersedes_the_old_order()
    {
        var first = await _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto());
        await AddCashInstallmentAsync(500m);

        var second = await _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto());

        Assert.NotEqual(first.OrderId, second.OrderId);
        Assert.Equal(100000, second.AmountPaise);
        Assert.Equal(OnlinePaymentOrderStatus.Cancelled, (await OrderAsync(first.OrderId)).Status);
    }

    [Fact]
    public async Task Repeated_verify_records_one_installment()
    {
        var order = await CreateOrderWithCaptureAsync();

        var first = await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));
        var second = await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        Assert.Equal("completed", first.Status);
        Assert.True(second.Success);
        Assert.Equal(1, _ledger.RecordCalls);
        Assert.Equal(1, await _db.MembershipPaymentTransactions.CountAsync());
        var stored = await OrderAsync(order.OrderId);
        Assert.NotNull(stored.MembershipPaymentTransactionId);
    }

    [Fact]
    public async Task Webhook_then_verify_and_repeated_webhooks_record_once()
    {
        var order = await CreateOrderWithCaptureAsync();
        var body = WebhookBody("payment.captured", order.OrderId, "captured", 150000);

        await _service.HandleRazorpayWebhookAsync(body, Sign(body));
        await _service.HandleRazorpayWebhookAsync(body, Sign(body));
        var verify = await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        Assert.Equal("completed", verify.Status);
        Assert.Equal(1, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Verify_then_webhook_records_once()
    {
        var order = await CreateOrderWithCaptureAsync();
        await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        var body = WebhookBody("order.paid", order.OrderId, "captured", 150000);
        var result = await _service.HandleRazorpayWebhookAsync(body, Sign(body));

        Assert.Equal("completed", result.Message);
        Assert.Equal(1, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Gateway_outage_during_verify_leaves_recoverable_state_then_status_check_records()
    {
        var order = await CreateOrderWithCaptureAsync();
        _gateway.Unavailable = true;

        var verify = await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        Assert.False(verify.Success);
        Assert.Equal("pending_verification", verify.Status);
        Assert.Equal(0, _ledger.RecordCalls);

        _gateway.Unavailable = false;
        var status = await _service.GetRazorpayOrderStatusAsync(MemberId, order.OrderId);

        Assert.Equal("completed", status.Status);
        Assert.Equal(1, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Ledger_failure_after_capture_is_retried_by_reconciliation_without_duplicates()
    {
        var order = await CreateOrderWithCaptureAsync();
        _ledger.FailNext = true;

        var verify = await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));
        Assert.Equal("pending_verification", verify.Status);
        Assert.Equal(0, await _db.MembershipPaymentTransactions.CountAsync());

        await BackdateAsync(order.OrderId, TimeSpan.FromMinutes(10));
        var changed = await _service.ReconcileOpenOrdersAsync();
        await _service.ReconcileOpenOrdersAsync();

        Assert.Equal(1, changed);
        Assert.Equal(OnlinePaymentOrderStatus.Completed, (await OrderAsync(order.OrderId)).Status);
        Assert.Equal(1, await _db.MembershipPaymentTransactions.CountAsync());
    }

    [Fact]
    public async Task Client_never_verifies_and_sweep_records_capture()
    {
        var order = await CreateOrderWithCaptureAsync();
        await BackdateAsync(order.OrderId, TimeSpan.FromMinutes(10));

        await _service.ReconcileOpenOrdersAsync();

        Assert.Equal(OnlinePaymentOrderStatus.Completed, (await OrderAsync(order.OrderId)).Status);
        Assert.Equal(1, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Cancelled_checkout_does_not_touch_billing_but_late_capture_still_applies()
    {
        var order = await _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto());

        var cancelled = await _service.CancelRazorpayOrderAsync(MemberId, order.OrderId);

        Assert.Equal("cancelled", cancelled.Status);
        Assert.Equal(1500m, (await HeaderAsync()).PendingAmount);
        Assert.Equal(0, _ledger.RecordCalls);

        var body = WebhookBody("payment.captured", order.OrderId, "captured", 150000);
        await _service.HandleRazorpayWebhookAsync(body, Sign(body));

        Assert.Equal(OnlinePaymentOrderStatus.Completed, (await OrderAsync(order.OrderId)).Status);
        Assert.Equal(1, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Cancel_after_payment_keeps_the_recorded_result()
    {
        var order = await CreateOrderWithCaptureAsync();
        await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        var result = await _service.CancelRazorpayOrderAsync(MemberId, order.OrderId);

        Assert.Equal("completed", result.Status);
    }

    [Fact]
    public async Task Cash_collected_meanwhile_flags_capture_for_review_without_changing_totals()
    {
        var order = await CreateOrderWithCaptureAsync();
        await AddCashInstallmentAsync(1500m);

        var verify = await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        Assert.Equal("review_required", verify.Status);
        Assert.Equal(0, _ledger.RecordCalls);
        var stored = await OrderAsync(order.OrderId);
        Assert.Equal(RazorpayPaymentRules.Reasons.Overpayment, stored.StatusReason);
        Assert.Equal(1500m, stored.CapturedAmount);
        Assert.Equal(0m, (await HeaderAsync()).PendingAmount);
        Assert.Contains(_audit.Actions, a => a == "online_payment_review_required");
    }

    [Fact]
    public async Task Signature_mismatch_is_rejected_and_order_untouched()
    {
        var order = await CreateOrderWithCaptureAsync();
        var request = VerifyRequest(order.OrderId);
        request.RazorpaySignature = new string('0', 64);

        await Assert.ThrowsAsync<ArgumentException>(() => _service.VerifyRazorpayPaymentAsync(MemberId, request));

        Assert.Equal(OnlinePaymentOrderStatus.Pending, (await OrderAsync(order.OrderId)).Status);
        Assert.Equal(0, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Webhook_with_bad_signature_is_rejected()
    {
        var order = await CreateOrderWithCaptureAsync();
        var body = WebhookBody("payment.captured", order.OrderId, "captured", 150000);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.HandleRazorpayWebhookAsync(body, "bad"));
        Assert.Equal(0, _ledger.RecordCalls);
    }

    [Fact]
    public async Task Payment_being_confirmed_blocks_a_second_order()
    {
        var order = await CreateOrderWithCaptureAsync();
        _gateway.Unavailable = true;
        await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));

        await Assert.ThrowsAsync<ConflictException>(
            () => _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto()));
    }

    [Fact]
    public async Task Settled_member_with_ended_period_is_told_to_renew_and_dates_are_untouched()
    {
        var order = await CreateOrderWithCaptureAsync();
        await _service.VerifyRazorpayPaymentAsync(MemberId, VerifyRequest(order.OrderId));
        var membership = await _db.UserMemberships.AsNoTracking().SingleAsync(m => m.Id == _membershipId);
        Assert.Equal(new DateTime(2026, 12, 31), membership.EndDate);

        await _db.UserMemberships.Where(m => m.Id == _membershipId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(m => m.Status, MembershipStatus.Expired)
                .SetProperty(m => m.EndDate, DateTime.UtcNow.Date.AddDays(-2)));

        var summary = await _service.GetMemberOnlinePaymentSummaryAsync(MemberId);

        Assert.Equal("renewal_required", summary.PaymentNeed);
        Assert.Null(summary.MembershipPaymentId);
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto()));
    }

    private async Task<RazorpayOrderResponseDto> CreateOrderWithCaptureAsync()
    {
        var order = await _service.CreateRazorpayOrderAsync(MemberId, new CreateRazorpayOrderRequestDto());
        _gateway.AddPayment(new GatewayPaymentSnapshot("pay_1", order.OrderId, "captured", order.AmountPaise, "INR"));
        return order;
    }

    private static RazorpayVerifyRequestDto VerifyRequest(string orderId, string paymentId = "pay_1") => new()
    {
        RazorpayOrderId = orderId,
        RazorpayPaymentId = paymentId,
        RazorpaySignature = RazorpayPaymentRules.ComputeHmacSha256Hex(
            KeySecret, Encoding.UTF8.GetBytes($"{orderId}|{paymentId}")),
    };

    private static byte[] WebhookBody(string evt, string orderId, string status, long amountPaise) =>
        Encoding.UTF8.GetBytes(
            $"{{\"event\":\"{evt}\",\"payload\":{{\"payment\":{{\"entity\":{{\"id\":\"pay_1\",\"order_id\":\"{orderId}\"," +
            $"\"status\":\"{status}\",\"amount\":{amountPaise},\"currency\":\"INR\"}}}}}}}}");

    private static string Sign(byte[] body) => RazorpayPaymentRules.ComputeHmacSha256Hex(WebhookSecret, body);

    private async Task AddCashInstallmentAsync(decimal amount)
    {
        _db.MembershipPaymentTransactions.Add(new MembershipPaymentTransaction
        {
            PaymentId = _headerId,
            ReceiptNumber = $"CASH-{Guid.NewGuid():N}",
            TransactionAmount = amount,
            TransactionMethod = MembershipPaymentMethod.Cash,
            TransactionDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        await _db.MembershipPayments.Where(p => p.Id == _headerId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.PaidAmount, p => p.PaidAmount + amount)
                .SetProperty(p => p.PendingAmount, p => p.PendingAmount - amount));
    }

    private async Task BackdateAsync(string orderId, TimeSpan by)
    {
        var created = DateTime.UtcNow - by;
        await _db.OnlinePaymentOrders.Where(o => o.GatewayOrderId == orderId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.CreatedDate, created)
                .SetProperty(o => o.LastCheckedAt, (DateTime?)null)
                .SetProperty(o => o.ProcessingStartedAt, (DateTime?)null));
    }

    private Task<OnlinePaymentOrder> OrderAsync(string orderId) =>
        _db.OnlinePaymentOrders.AsNoTracking().SingleAsync(o => o.GatewayOrderId == orderId);

    private Task<MembershipPayment> HeaderAsync() =>
        _db.MembershipPayments.AsNoTracking().SingleAsync(p => p.Id == _headerId);

    private sealed class FakeGateway : IRazorpayGatewayClient
    {
        private readonly List<GatewayPaymentSnapshot> _payments = new();
        public bool Unavailable { get; set; }
        public int OrdersCreated { get; private set; }

        public void AddPayment(GatewayPaymentSnapshot payment) => _payments.Add(payment);

        public Task<string> CreateOrderAsync(
            int amountPaise,
            string currency,
            string receipt,
            IReadOnlyDictionary<string, string> notes,
            CancellationToken cancellationToken = default)
        {
            OrdersCreated++;
            return Task.FromResult($"order_{OrdersCreated}");
        }

        public Task<GatewayPaymentSnapshot?> FetchPaymentAsync(string paymentId, CancellationToken cancellationToken = default)
        {
            ThrowIfUnavailable();
            return Task.FromResult(_payments.FirstOrDefault(p => p.PaymentId == paymentId));
        }

        public Task<IReadOnlyList<GatewayPaymentSnapshot>> FetchOrderPaymentsAsync(
            string orderId,
            CancellationToken cancellationToken = default)
        {
            ThrowIfUnavailable();
            return Task.FromResult<IReadOnlyList<GatewayPaymentSnapshot>>(
                _payments.Where(p => p.OrderId == orderId).ToList());
        }

        private void ThrowIfUnavailable()
        {
            if (Unavailable)
                throw new RazorpayGatewayUnavailableException("offline");
        }
    }

    private sealed class FakeAudit : IFinancialAuditService
    {
        public List<string> Actions { get; } = new();

        public Task LogAsync(
            string entityType,
            int entityId,
            string action,
            int? actorUserId,
            int? membershipPaymentId = null,
            int? userId = null,
            string? detailsJson = null,
            CancellationToken cancellationToken = default)
        {
            Actions.Add(action);
            return Task.CompletedTask;
        }
    }

    /// <summary>Stand-in for MembershipPaymentService: same overpayment guard, writes the ledger row.</summary>
    public class FakeLedger : DispatchProxy
    {
        public ApplicationDbContext Db { get; set; } = null!;
        public int RecordCalls { get; private set; }
        public bool FailNext { get; set; }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => targetMethod?.Name switch
        {
            nameof(IMembershipPaymentService.RecordInstallmentAsync) =>
                RecordAsync((int)args![0]!, (RecordMembershipPaymentInstallmentDto)args[1]!),
            nameof(IMembershipPaymentService.GetByUserIdAsync) =>
                Task.FromResult<IReadOnlyList<MembershipPaymentDto>>(Array.Empty<MembershipPaymentDto>()),
            _ => throw new NotSupportedException(targetMethod?.Name),
        };

        private async Task<MembershipPaymentDto> RecordAsync(int headerId, RecordMembershipPaymentInstallmentDto dto)
        {
            if (FailNext)
            {
                FailNext = false;
                Db.MembershipPaymentTransactions.Add(new MembershipPaymentTransaction
                {
                    PaymentId = headerId,
                    ReceiptNumber = "ROLLED-BACK",
                    TransactionAmount = dto.Amount,
                    TransactionMethod = dto.Method,
                    ReferenceNumber = dto.ReferenceNumber,
                });
                throw new TimeoutException("database timeout");
            }

            RecordCalls++;
            var header = await Db.MembershipPayments.SingleAsync(p => p.Id == headerId);
            if (dto.Amount - header.PendingAmount > 0.02m)
                throw new BadRequestException("Payment amount cannot exceed outstanding balance.");
            Db.MembershipPaymentTransactions.Add(new MembershipPaymentTransaction
            {
                PaymentId = headerId,
                ReceiptNumber = $"R-{RecordCalls}",
                TransactionAmount = dto.Amount,
                TransactionMethod = dto.Method,
                ReferenceNumber = dto.ReferenceNumber,
                TransactionDate = dto.TransactionDate,
            });
            header.PaidAmount += dto.Amount;
            header.PendingAmount = Math.Max(0, header.PendingAmount - dto.Amount);
            header.PaymentStatus = header.PendingAmount <= 0.02m ? MembershipPaymentStatus.Paid : MembershipPaymentStatus.Partial;
            await Db.SaveChangesAsync();
            return new MembershipPaymentDto { Id = headerId };
        }
    }

    private sealed class RazorpayTestContext(DbContextOptions<ApplicationDbContext> options) : ApplicationDbContext(options)
    {
        private static readonly Type[] Kept =
        {
            typeof(OnlinePaymentOrder),
            typeof(MembershipPayment),
            typeof(MembershipPaymentTransaction),
            typeof(UserMembership),
            typeof(User),
            typeof(AuthUser),
            typeof(MembershipPlan),
        };

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            foreach (var entity in modelBuilder.Model.GetEntityTypes().ToArray())
                if (!Kept.Contains(entity.ClrType)) modelBuilder.Ignore(entity.ClrType);

            foreach (var type in Kept)
            {
                foreach (var property in type.GetProperties())
                {
                    var target = property.PropertyType.IsGenericType
                        ? property.PropertyType.GetGenericArguments()[0]
                        : property.PropertyType;
                    if (typeof(BaseEntity).IsAssignableFrom(target) && !Kept.Contains(target))
                        modelBuilder.Entity(type).Ignore(property.Name);
                }
            }

            modelBuilder.Entity<OnlinePaymentOrder>().Property(o => o.Status).HasConversion<string>();
            modelBuilder.Entity<OnlinePaymentOrder>()
                .HasIndex(o => o.GatewayPaymentId)
                .IsUnique()
                .HasFilter("[GatewayPaymentId] IS NOT NULL AND [IsDeleted] = 0");
        }
    }
}
