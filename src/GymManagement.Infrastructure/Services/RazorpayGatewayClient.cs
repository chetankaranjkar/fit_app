using System.Net;
using System.Text;
using System.Text.Json;
using GymManagement.Core.Validation;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>Razorpay could not be reached or returned a server error; the caller should retry later.</summary>
    public sealed class RazorpayGatewayUnavailableException : Exception
    {
        public RazorpayGatewayUnavailableException(string message, Exception? inner = null) : base(message, inner)
        {
        }
    }

    public interface IRazorpayGatewayClient
    {
        Task<string> CreateOrderAsync(
            int amountPaise,
            string currency,
            string receipt,
            IReadOnlyDictionary<string, string> notes,
            CancellationToken cancellationToken = default);

        /// <summary>Null when Razorpay does not know the payment id.</summary>
        Task<GatewayPaymentSnapshot?> FetchPaymentAsync(string paymentId, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<GatewayPaymentSnapshot>> FetchOrderPaymentsAsync(
            string orderId,
            CancellationToken cancellationToken = default);
    }

    public sealed class RazorpayGatewayClient : IRazorpayGatewayClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<RazorpayGatewayClient> _logger;

        public RazorpayGatewayClient(IHttpClientFactory httpClientFactory, ILogger<RazorpayGatewayClient> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<string> CreateOrderAsync(
            int amountPaise,
            string currency,
            string receipt,
            IReadOnlyDictionary<string, string> notes,
            CancellationToken cancellationToken = default)
        {
            var json = JsonSerializer.Serialize(new { amount = amountPaise, currency, receipt, notes });
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var (status, body) = await SendAsync(HttpMethod.Post, "orders", content, cancellationToken).ConfigureAwait(false);
            if (status is < 200 or >= 300)
            {
                _logger.LogWarning("Razorpay order creation failed: {Status} {Body}", status, body);
                throw new InvalidOperationException("Could not create payment order. Try again later.");
            }

            using var doc = JsonDocument.Parse(body);
            var orderId = doc.RootElement.TryGetProperty("id", out var id) ? id.GetString() : null;
            if (string.IsNullOrWhiteSpace(orderId))
                throw new InvalidOperationException("Invalid response from payment gateway.");
            return orderId;
        }

        public async Task<GatewayPaymentSnapshot?> FetchPaymentAsync(
            string paymentId,
            CancellationToken cancellationToken = default)
        {
            var (status, body) = await SendAsync(
                HttpMethod.Get,
                $"payments/{Uri.EscapeDataString(paymentId)}",
                null,
                cancellationToken).ConfigureAwait(false);
            if (status is (int)HttpStatusCode.NotFound or (int)HttpStatusCode.BadRequest)
                return null;
            EnsureSuccess(status, body, "payment fetch");
            using var doc = JsonDocument.Parse(body);
            return ParsePayment(doc.RootElement);
        }

        public async Task<IReadOnlyList<GatewayPaymentSnapshot>> FetchOrderPaymentsAsync(
            string orderId,
            CancellationToken cancellationToken = default)
        {
            var (status, body) = await SendAsync(
                HttpMethod.Get,
                $"orders/{Uri.EscapeDataString(orderId)}/payments",
                null,
                cancellationToken).ConfigureAwait(false);
            if (status is (int)HttpStatusCode.NotFound or (int)HttpStatusCode.BadRequest)
                return Array.Empty<GatewayPaymentSnapshot>();
            EnsureSuccess(status, body, "order payments fetch");
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
                return Array.Empty<GatewayPaymentSnapshot>();
            return items.EnumerateArray().Select(ParsePayment).OfType<GatewayPaymentSnapshot>().ToList();
        }

        /// <summary>Maps a Razorpay payment entity (API or webhook <c>payload.payment.entity</c>).</summary>
        public static GatewayPaymentSnapshot? ParsePayment(JsonElement entity)
        {
            if (entity.ValueKind != JsonValueKind.Object)
                return null;
            var id = ReadString(entity, "id");
            if (string.IsNullOrWhiteSpace(id))
                return null;
            var amount = entity.TryGetProperty("amount", out var a) && a.ValueKind == JsonValueKind.Number
                ? a.GetInt64()
                : 0;
            return new GatewayPaymentSnapshot(
                id,
                ReadString(entity, "order_id"),
                ReadString(entity, "status") ?? string.Empty,
                amount,
                ReadString(entity, "currency"));
        }

        private static string? ReadString(JsonElement e, string name) =>
            e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

        private void EnsureSuccess(int status, string body, string operation)
        {
            if (status is >= 200 and < 300)
                return;
            _logger.LogWarning("Razorpay {Operation} failed: {Status} {Body}", operation, status, body);
            throw new RazorpayGatewayUnavailableException($"Razorpay {operation} failed ({status}).");
        }

        private async Task<(int Status, string Body)> SendAsync(
            HttpMethod method,
            string path,
            HttpContent? content,
            CancellationToken cancellationToken)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("Razorpay");
                using var request = new HttpRequestMessage(method, path) { Content = content };
                using var response = await client.SendAsync(request, cancellationToken).ConfigureAwait(false);
                var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                return ((int)response.StatusCode, body);
            }
            catch (HttpRequestException ex)
            {
                throw new RazorpayGatewayUnavailableException("Payment gateway is unreachable.", ex);
            }
            catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                throw new RazorpayGatewayUnavailableException("Payment gateway timed out.", ex);
            }
        }
    }
}
