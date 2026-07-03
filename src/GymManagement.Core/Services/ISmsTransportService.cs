namespace GymManagement.Core.Services;

/// <summary>Low-level text-message delivery via configured outbound webhooks (SMS and/or WhatsApp).</summary>
public interface ISmsTransportService
{
    /// <summary>True when at least one channel (SMS or WhatsApp) has a webhook configured and enabled.</summary>
    Task<bool> IsConfiguredAsync(CancellationToken ct = default);

    /// <summary>True when at least one configured channel has expiry reminders enabled.</summary>
    Task<bool> AllowsExpiryRemindersAsync(CancellationToken ct = default);

    /// <summary>
    /// Sends the message to every enabled+configured channel that permits the given event type.
    /// </summary>
    Task SendAsync(string toPhone, string message, int? memberId = null, string? eventType = null, CancellationToken ct = default);

    /// <summary>
    /// Sends a test message to a single channel ("sms" or "whatsapp"). Throws when that channel is not configured.
    /// </summary>
    Task SendTestAsync(string channel, string toPhone, CancellationToken ct = default);
}
