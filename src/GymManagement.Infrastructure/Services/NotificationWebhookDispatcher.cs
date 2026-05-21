using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services
{
    public sealed class NotificationWebhookDispatcher : INotificationWebhookDispatcher
    {
        private const string HttpClientName = "notification-webhooks";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IOptions<NotificationWebhookOptions> _options;
        private readonly ILogger<NotificationWebhookDispatcher> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public NotificationWebhookDispatcher(
            IHttpClientFactory httpClientFactory,
            IOptions<NotificationWebhookOptions> options,
            ILogger<NotificationWebhookDispatcher> logger)
        {
            _httpClientFactory = httpClientFactory;
            _options = options;
            _logger = logger;
        }

        public async Task DispatchPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken cancellationToken = default)
        {
            var opts = _options.Value;
            try
            {
                await PostEnvelopeAsync("email", opts.EmailWebhookUrl, NotificationWebhookEventTypes.PaymentReceipt, dto, opts, cancellationToken)
                    .ConfigureAwait(false);
                await PostEnvelopeAsync("whatsapp", opts.WhatsAppWebhookUrl, NotificationWebhookEventTypes.PaymentReceipt, dto, opts, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching payment receipt webhooks.");
            }
        }

        public async Task DispatchMembershipExpiringAsync(MembershipExpiringNotificationDto dto, CancellationToken cancellationToken = default)
        {
            var opts = _options.Value;
            try
            {
                await PostEnvelopeAsync("email", opts.EmailWebhookUrl, NotificationWebhookEventTypes.MembershipExpiring, dto, opts, cancellationToken)
                    .ConfigureAwait(false);
                await PostEnvelopeAsync("whatsapp", opts.WhatsAppWebhookUrl, NotificationWebhookEventTypes.MembershipExpiring, dto, opts, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching membership expiry webhooks.");
            }
        }

        public async Task DispatchDietAssignmentAssignedAsync(
            DietAssignmentAssignedNotificationDto dto,
            CancellationToken cancellationToken = default)
        {
            var opts = _options.Value;
            try
            {
                await PostEnvelopeAsync(
                        "email",
                        opts.EmailWebhookUrl,
                        NotificationWebhookEventTypes.DietAssignmentAssigned,
                        dto,
                        opts,
                        cancellationToken)
                    .ConfigureAwait(false);
                await PostEnvelopeAsync(
                        "whatsapp",
                        opts.WhatsAppWebhookUrl,
                        NotificationWebhookEventTypes.DietAssignmentAssigned,
                        dto,
                        opts,
                        cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching diet assignment webhooks.");
            }
        }

        private async Task PostEnvelopeAsync(
            string channel,
            string? url,
            string eventType,
            object data,
            NotificationWebhookOptions opts,
            CancellationToken cancellationToken)
        {
            var envelope = new
            {
                eventType,
                channel,
                occurredAtUtc = DateTime.UtcNow,
                data,
            };
            await PostAsync(channel, url, envelope, opts, cancellationToken).ConfigureAwait(false);
        }

        private async Task PostAsync(
            string channel,
            string? url,
            object envelope,
            NotificationWebhookOptions opts,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                _logger.LogDebug("Notification webhook ({Channel}): URL not configured; skipped.", channel);
                return;
            }

            var client = _httpClientFactory.CreateClient(HttpClientName);
            var json = JsonSerializer.Serialize(envelope, JsonOptions);
            var max = Math.Max(1, opts.MaxRetries);
            var delayMs = 500;

            for (var attempt = 1; attempt <= max; attempt++)
            {
                try
                {
                    using var content = new StringContent(json, Encoding.UTF8, "application/json");
                    content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

                    using var response = await client.PostAsync(url, content, cancellationToken).ConfigureAwait(false);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation(
                            "Notification webhook ({Channel}) delivered: {Status} (attempt {Attempt}/{Max}).",
                            channel,
                            (int)response.StatusCode,
                            attempt,
                            max);
                        return;
                    }

                    if ((int)response.StatusCode >= 500 || response.StatusCode == HttpStatusCode.RequestTimeout)
                    {
                        _logger.LogWarning(
                            "Notification webhook ({Channel}) transient failure: {Status} (attempt {Attempt}/{Max}).",
                            channel,
                            (int)response.StatusCode,
                            attempt,
                            max);
                    }
                    else
                    {
                        var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                        _logger.LogWarning(
                            "Notification webhook ({Channel}) non-retryable response: {Status} — {Body}",
                            channel,
                            (int)response.StatusCode,
                            body.Length > 500 ? body[..500] + "…" : body);
                        return;
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Notification webhook ({Channel}) request failed (attempt {Attempt}/{Max}).",
                        channel,
                        attempt,
                        max);
                }

                if (attempt < max)
                    await Task.Delay(delayMs, cancellationToken).ConfigureAwait(false);
                delayMs = Math.Min(delayMs * 2, 8000);
            }

            _logger.LogError("Notification webhook ({Channel}) failed after {Max} attempts.", channel, max);
        }
    }
}
