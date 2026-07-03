using System.Text;
using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services.Notifications;

/// <summary>
/// Delivers SMS / WhatsApp by POSTing a JSON envelope to the configured outbound webhook(s).
/// Fans out to every enabled channel; prefers DB-backed settings and falls back to the legacy
/// <c>Notifications:WhatsAppWebhookUrl</c> option for the WhatsApp channel.
/// </summary>
public sealed class SmsWebhookTransportService : ISmsTransportService
{
    private const string HttpClientName = "notification-webhooks";

    private readonly ISmsSettingsService _smsSettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<NotificationWebhookOptions> _legacyOptions;
    private readonly ILogger<SmsWebhookTransportService> _logger;

    public SmsWebhookTransportService(
        ISmsSettingsService smsSettings,
        IHttpClientFactory httpClientFactory,
        IOptions<NotificationWebhookOptions> legacyOptions,
        ILogger<SmsWebhookTransportService> logger)
    {
        _smsSettings = smsSettings;
        _httpClientFactory = httpClientFactory;
        _legacyOptions = legacyOptions;
        _logger = logger;
    }

    public async Task<bool> IsConfiguredAsync(CancellationToken ct = default)
    {
        var channels = await ResolveChannelsAsync(ct).ConfigureAwait(false);
        return channels.Count > 0;
    }

    public async Task<bool> AllowsExpiryRemindersAsync(CancellationToken ct = default)
    {
        var channels = await ResolveChannelsAsync(ct).ConfigureAwait(false);
        return channels.Any(c => c.SendMembershipExpiryReminders);
    }

    public async Task SendAsync(
        string toPhone,
        string message,
        int? memberId = null,
        string? eventType = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toPhone))
            throw new ArgumentException("Recipient phone number is required.", nameof(toPhone));

        var channels = await ResolveChannelsAsync(ct).ConfigureAwait(false);
        if (channels.Count == 0)
            throw new InvalidOperationException("No SMS/WhatsApp webhook is configured.");

        var targets = channels.Where(c => AllowsEvent(c, eventType)).ToList();
        if (targets.Count == 0)
        {
            _logger.LogDebug("Text message ({Event}) skipped: no channel permits this event type.", eventType);
            return;
        }

        var sent = 0;
        Exception? lastError = null;

        foreach (var channel in targets)
        {
            try
            {
                await PostAsync(channel, toPhone.Trim(), message, memberId, eventType, ct).ConfigureAwait(false);
                sent++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                lastError = ex;
                _logger.LogWarning(ex, "Text message via {Channel} webhook failed.", channel.Channel);
            }
        }

        // Only fail (and let the outbox retry) when no channel succeeded.
        if (sent == 0 && lastError != null)
            throw lastError;
    }

    public async Task SendTestAsync(string channel, string toPhone, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toPhone))
            throw new ArgumentException("Recipient phone number is required.", nameof(toPhone));

        var requested = string.Equals(channel, TextMessageChannels.WhatsApp, StringComparison.OrdinalIgnoreCase)
            ? TextMessageChannels.WhatsApp
            : TextMessageChannels.Sms;

        var channels = await ResolveChannelsAsync(ct).ConfigureAwait(false);
        var target = channels.FirstOrDefault(c =>
            string.Equals(c.Channel, requested, StringComparison.OrdinalIgnoreCase));

        if (target is null)
        {
            var label = requested == TextMessageChannels.WhatsApp ? "WhatsApp" : "SMS";
            throw new InvalidOperationException($"{label} webhook is not configured.");
        }

        await PostAsync(
            target,
            toPhone.Trim(),
            $"Test {(requested == TextMessageChannels.WhatsApp ? "WhatsApp" : "SMS")} message from your gym management system. This channel is configured correctly.",
            memberId: null,
            eventType: "test_message",
            ct).ConfigureAwait(false);
    }

    private async Task PostAsync(
        SmsConnectionConfig channel,
        string toPhone,
        string message,
        int? memberId,
        string? eventType,
        CancellationToken ct)
    {
        var envelope = new
        {
            eventType = eventType ?? "sms",
            channel = channel.Channel,
            occurredAtUtc = DateTime.UtcNow,
            data = new
            {
                memberPhone = toPhone,
                message,
                memberId,
                senderId = channel.SenderId,
            },
        };

        var client = _httpClientFactory.CreateClient(HttpClientName);
        var json = JsonSerializer.Serialize(envelope);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, channel.WebhookUrl) { Content = content };
        if (!string.IsNullOrWhiteSpace(channel.AuthHeader))
        {
            if (!request.Headers.TryAddWithoutValidation("Authorization", channel.AuthHeader))
                _logger.LogWarning("{Channel} webhook auth header could not be applied.", channel.Channel);
        }

        using var response = await client.SendAsync(request, ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }

    private static bool AllowsEvent(SmsConnectionConfig channel, string? eventType) =>
        eventType switch
        {
            NotificationTemplateCodes.PaymentSuccess => channel.SendPaymentReceipts,
            NotificationTemplateCodes.MembershipRenewalReminder => channel.SendMembershipExpiryReminders,
            NotificationTemplateCodes.MembershipExpired => channel.SendMembershipExpiryReminders,
            _ => true,
        };

    private async Task<List<SmsConnectionConfig>> ResolveChannelsAsync(CancellationToken ct)
    {
        var result = new List<SmsConnectionConfig>(2);

        var sms = await _smsSettings.GetSmsConfigAsync(ct).ConfigureAwait(false);
        if (sms.IsConfigured)
            result.Add(sms);

        var whatsApp = await _smsSettings.GetWhatsAppConfigAsync(ct).ConfigureAwait(false);
        if (whatsApp.IsConfigured)
            result.Add(whatsApp);

        // Legacy fallback: appsettings WhatsApp webhook when DB WhatsApp not configured.
        if (!whatsApp.IsConfigured)
        {
            var legacyUrl = _legacyOptions.Value.WhatsAppWebhookUrl;
            if (!string.IsNullOrWhiteSpace(legacyUrl))
            {
                result.Add(new SmsConnectionConfig
                {
                    Channel = TextMessageChannels.WhatsApp,
                    Enabled = true,
                    WebhookUrl = legacyUrl.Trim(),
                });
            }
        }

        return result;
    }
}
