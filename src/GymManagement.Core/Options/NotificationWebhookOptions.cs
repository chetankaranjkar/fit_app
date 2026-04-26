namespace GymManagement.Core.Options
{
    /// <summary>Outbound webhook URLs for email/WhatsApp automation (e.g. n8n, Zapier, custom HTTP endpoint).</summary>
    public class NotificationWebhookOptions
    {
        public const string SectionName = "Notifications";

        /// <summary>POST JSON payloads for email-oriented automations (receipts, reminders).</summary>
        public string? EmailWebhookUrl { get; set; }

        /// <summary>POST JSON payloads for WhatsApp-oriented automations.</summary>
        public string? WhatsAppWebhookUrl { get; set; }

        /// <summary>Retry count for transient HTTP failures (default 3 attempts total).</summary>
        public int MaxRetries { get; set; } = 3;

        /// <summary>Per-request timeout.</summary>
        public int TimeoutSeconds { get; set; } = 15;

        /// <summary>When true, periodically scans memberships and POSTs reminder events to configured webhooks.</summary>
        public bool EnableScheduledReminders { get; set; }

        /// <summary>Delay between reminder scans.</summary>
        public int ReminderIntervalHours { get; set; } = 24;

        /// <summary>Include memberships whose end date falls within this many days from today.</summary>
        public int MembershipExpiryReminderDays { get; set; } = 7;
    }
}
