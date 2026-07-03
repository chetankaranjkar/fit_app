namespace GymManagement.Domain.Entities;

/// <summary>Singleton gym configuration (row Id = 1).</summary>
public class GymSetting
{
    public int Id { get; set; } = 1;

    public bool AllowMemberWorkoutPlanCreation { get; set; } = true;

    /// <summary>Max personal plans per member. Use -1 for unlimited.</summary>
    public int MaxPersonalWorkoutPlansPerMember { get; set; } = 1;

    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;

    public string? GymName { get; set; }

    /// <summary>App-relative URL for general gym branding (e.g. /uploads/branding/...).</summary>
    public string? GymLogoUrl { get; set; }

    /// <summary>Logo shown on membership invoice PDFs. Falls back to <see cref="GymLogoUrl"/>.</summary>
    public string? InvoiceLogoUrl { get; set; }

    /// <summary>When true and SMTP is configured, the API sends email directly (renewals, receipts, diet).</summary>
    public bool EmailNotificationsEnabled { get; set; }

    public string? SmtpHost { get; set; }

    public int SmtpPort { get; set; } = 587;

    public bool SmtpUseStartTls { get; set; } = true;

    public string? SmtpUsername { get; set; }

    /// <summary>ASP.NET Data Protection–encrypted SMTP password.</summary>
    public string? SmtpPasswordProtected { get; set; }

    public string? EmailFromAddress { get; set; }

    public string? EmailFromDisplayName { get; set; }

    public bool EmailSendPaymentReceipts { get; set; } = true;

    public bool EmailSendMembershipExpiryReminders { get; set; } = true;

    public bool EmailSendDietAssignments { get; set; } = true;

    public DateTime? EmailSettingsUpdatedDate { get; set; }

    // ── SMS / WhatsApp (webhook-based) ─────────────────────────────

    /// <summary>When true and a webhook URL is set, the API sends SMS/WhatsApp via the configured webhook.</summary>
    public bool SmsNotificationsEnabled { get; set; }

    /// <summary>Outbound webhook URL that delivers SMS/WhatsApp (n8n, Zapier, custom HTTP endpoint, gateway bridge).</summary>
    public string? SmsWebhookUrl { get; set; }

    /// <summary>Optional sender id / WhatsApp business number shown to recipients.</summary>
    public string? SmsSenderId { get; set; }

    /// <summary>ASP.NET Data Protection–encrypted Authorization header value sent with each webhook call (optional).</summary>
    public string? SmsAuthHeaderProtected { get; set; }

    public bool SmsSendPaymentReceipts { get; set; } = true;

    public bool SmsSendMembershipExpiryReminders { get; set; } = true;

    public DateTime? SmsSettingsUpdatedDate { get; set; }

    // ── WhatsApp (webhook-based) ───────────────────────────────────

    /// <summary>When true and a webhook URL is set, the API sends WhatsApp via the configured webhook.</summary>
    public bool WhatsAppNotificationsEnabled { get; set; }

    /// <summary>Outbound webhook URL that delivers WhatsApp messages.</summary>
    public string? WhatsAppWebhookUrl { get; set; }

    /// <summary>Optional WhatsApp business number / sender id shown to recipients.</summary>
    public string? WhatsAppSenderId { get; set; }

    /// <summary>ASP.NET Data Protection–encrypted Authorization header value sent with each WhatsApp webhook call (optional).</summary>
    public string? WhatsAppAuthHeaderProtected { get; set; }

    public bool WhatsAppSendPaymentReceipts { get; set; } = true;

    public bool WhatsAppSendMembershipExpiryReminders { get; set; } = true;
}
