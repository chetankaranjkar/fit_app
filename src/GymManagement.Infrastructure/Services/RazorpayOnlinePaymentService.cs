using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services
{
    public sealed class RazorpayOnlinePaymentService : IOnlinePaymentService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            PropertyNameCaseInsensitive = true,
        };

        private readonly ApplicationDbContext _db;
        private readonly IMembershipPaymentService _membershipPaymentService;
        private readonly IBillingCalculationService _billing;
        private readonly CommercialOptions _options;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<RazorpayOnlinePaymentService> _logger;

        public RazorpayOnlinePaymentService(
            ApplicationDbContext db,
            IMembershipPaymentService membershipPaymentService,
            IBillingCalculationService billing,
            IOptions<CommercialOptions> options,
            IHttpClientFactory httpClientFactory,
            ILogger<RazorpayOnlinePaymentService> logger)
        {
            _db = db;
            _membershipPaymentService = membershipPaymentService;
            _billing = billing;
            _options = options.Value;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(
            int userId,
            CreateRazorpayOrderRequestDto request,
            CancellationToken cancellationToken = default)
        {
            EnsureOnlinePaymentsEnabled();

            var header = await ResolveMembershipPaymentHeaderAsync(userId, request.MembershipPaymentId, cancellationToken)
                .ConfigureAwait(false);
            var pending = header.PendingAmount;
            if (pending <= 0)
                throw new InvalidOperationException("No pending balance to pay online.");

            var amountPaise = ToPaise(pending);
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

            var receipt = $"mp-{header.Id}-{DateTime.UtcNow:yyyyMMddHHmmss}";
            var orderPayload = new
            {
                amount = amountPaise,
                currency = "INR",
                receipt,
                notes = new Dictionary<string, string>
                {
                    ["membershipPaymentId"] = header.Id.ToString(),
                    ["userId"] = userId.ToString(),
                },
            };

            var gatewayOrderId = await CreateRazorpayOrderRemoteAsync(orderPayload, cancellationToken)
                .ConfigureAwait(false);

            var tracked = new OnlinePaymentOrder
            {
                MembershipPaymentId = header.Id,
                UserId = userId,
                GatewayOrderId = gatewayOrderId,
                Amount = pending,
                Currency = "INR",
                Status = OnlinePaymentOrderStatus.Pending,
                CreatedDate = DateTime.UtcNow,
            };
            _db.OnlinePaymentOrders.Add(tracked);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return new RazorpayOrderResponseDto
            {
                OrderId = gatewayOrderId,
                KeyId = _options.RazorpayKeyId!.Trim(),
                AmountPaise = amountPaise,
                Amount = pending,
                Currency = "INR",
                MembershipPaymentId = header.Id,
                BusinessName = _options.CheckoutBusinessName,
                MemberEmail = authEmail,
                MemberPhone = user.Phone,
                MemberName = $"{user.FirstName} {user.LastName}".Trim(),
            };
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

            if (!VerifySignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature))
                throw new UnauthorizedAccessException("Payment signature verification failed.");

            var order = await _db.OnlinePaymentOrders
                .FirstOrDefaultAsync(
                    o => o.GatewayOrderId == request.RazorpayOrderId && o.UserId == userId && !o.IsDeleted,
                    cancellationToken)
                .ConfigureAwait(false)
                ?? throw new KeyNotFoundException("Online payment order not found.");

            if (order.Status == OnlinePaymentOrderStatus.Completed)
            {
                var existing = (await _membershipPaymentService
                    .GetByUserIdAsync(userId, cancellationToken)
                    .ConfigureAwait(false))
                    .FirstOrDefault(p => p.Id == order.MembershipPaymentId);
                return new RazorpayVerifyResponseDto
                {
                    Success = true,
                    Message = "Payment was already recorded.",
                    Payment = existing,
                };
            }

            var installment = new RecordMembershipPaymentInstallmentDto
            {
                Amount = order.Amount,
                Method = MembershipPaymentMethod.Online,
                ReferenceNumber = request.RazorpayPaymentId.Trim(),
                TransactionDate = DateTime.UtcNow,
                Remarks = $"Razorpay order {request.RazorpayOrderId}",
            };

            var payment = await _membershipPaymentService
                .RecordInstallmentAsync(order.MembershipPaymentId, installment, staffUserId: null, cancellationToken)
                .ConfigureAwait(false);

            order.Status = OnlinePaymentOrderStatus.Completed;
            order.GatewayPaymentId = request.RazorpayPaymentId.Trim();
            order.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            _logger.LogInformation(
                "Recorded online membership payment {PaymentId} for user {UserId} via Razorpay {GatewayPaymentId}",
                order.MembershipPaymentId,
                userId,
                order.GatewayPaymentId);

            return new RazorpayVerifyResponseDto
            {
                Success = true,
                Message = "Payment recorded successfully.",
                Payment = payment,
            };
        }

        private void EnsureOnlinePaymentsEnabled()
        {
            if (!_options.EnableOnlinePayments)
                throw new InvalidOperationException("Online payments are not enabled for this gym.");
            if (!_options.IsRazorpayConfigured)
                throw new InvalidOperationException("Razorpay is not configured.");
        }

        private async Task<MembershipPayment> ResolveMembershipPaymentHeaderAsync(
            int userId,
            int? membershipPaymentId,
            CancellationToken cancellationToken)
        {
            MembershipPayment? header;
            if (membershipPaymentId.HasValue && membershipPaymentId.Value > 0)
            {
                header = await _db.MembershipPayments
                    .FirstOrDefaultAsync(
                        p => p.Id == membershipPaymentId.Value && p.UserId == userId && !p.IsDeleted,
                        cancellationToken)
                    .ConfigureAwait(false);
            }
            else
            {
                header = await _db.MembershipPayments
                    .Where(p => p.UserId == userId && !p.IsDeleted && p.PaymentStatus != MembershipPaymentStatus.Paid && p.PendingAmount > 0)
                    .OrderByDescending(p => p.CreatedDate)
                    .FirstOrDefaultAsync(cancellationToken)
                    .ConfigureAwait(false);
            }

            if (header == null)
                throw new KeyNotFoundException("No open membership payment was found.");

            _billing.RecalculateHeader(header);
            return header;
        }

        private async Task<string> CreateRazorpayOrderRemoteAsync(object payload, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("Razorpay");
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("orders", content, cancellationToken).ConfigureAwait(false);
            var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Razorpay order creation failed: {Status} {Body}", response.StatusCode, body);
                throw new InvalidOperationException("Could not create payment order. Try again later.");
            }

            using var doc = JsonDocument.Parse(body);
            var orderId = doc.RootElement.GetProperty("id").GetString();
            if (string.IsNullOrWhiteSpace(orderId))
                throw new InvalidOperationException("Invalid response from payment gateway.");
            return orderId;
        }

        private bool VerifySignature(string orderId, string paymentId, string signature)
        {
            var secret = _options.RazorpayKeySecret!.Trim();
            var payload = $"{orderId}|{paymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expected = Convert.ToHexString(hash).ToLowerInvariant();
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
        }

        private static int ToPaise(decimal amount) =>
            (int)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
    }
}
