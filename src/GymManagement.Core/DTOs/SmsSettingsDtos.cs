namespace GymManagement.Core.DTOs;

/// <summary>Channel discriminator for text-message delivery.</summary>
public static class TextMessageChannels
{
    public const string Sms = "sms";
    public const string WhatsApp = "whatsapp";
}

public sealed class SmsChannelSettingsDto
{
    public bool Enabled { get; set; }
    public string? WebhookUrl { get; set; }
    public string? SenderId { get; set; }
    public bool HasAuthHeaderConfigured { get; set; }
    public bool SendPaymentReceipts { get; set; } = true;
    public bool SendMembershipExpiryReminders { get; set; } = true;
    public bool IsConfigured { get; set; }
}

public class SmsSettingsDto
{
    public SmsChannelSettingsDto Sms { get; set; } = new();
    public SmsChannelSettingsDto WhatsApp { get; set; } = new();
    public DateTime? UpdatedDateUtc { get; set; }
}

public sealed class UpdateSmsChannelDto
{
    public bool Enabled { get; set; }
    public string? WebhookUrl { get; set; }
    public string? SenderId { get; set; }
    /// <summary>When null/empty, keeps the existing stored auth header.</summary>
    public string? AuthHeader { get; set; }
    /// <summary>When true, clears any stored auth header.</summary>
    public bool ClearAuthHeader { get; set; }
    public bool SendPaymentReceipts { get; set; } = true;
    public bool SendMembershipExpiryReminders { get; set; } = true;
}

public class UpdateSmsSettingsDto
{
    public UpdateSmsChannelDto Sms { get; set; } = new();
    public UpdateSmsChannelDto WhatsApp { get; set; } = new();
}

public class TestSmsSettingsDto
{
    public string ToPhone { get; set; } = string.Empty;
    /// <summary>"sms" or "whatsapp". Defaults to whichever channel is configured.</summary>
    public string? Channel { get; set; }
}

/// <summary>Resolved per-channel delivery config used by the transport.</summary>
public sealed class SmsConnectionConfig
{
    /// <summary>"sms" or "whatsapp" — also used as the webhook envelope channel.</summary>
    public string Channel { get; set; } = TextMessageChannels.Sms;
    public bool Enabled { get; set; }
    public string WebhookUrl { get; set; } = string.Empty;
    public string? SenderId { get; set; }
    public string? AuthHeader { get; set; }
    public bool SendPaymentReceipts { get; set; } = true;
    public bool SendMembershipExpiryReminders { get; set; } = true;

    public bool IsConfigured =>
        Enabled && !string.IsNullOrWhiteSpace(WebhookUrl);
}
