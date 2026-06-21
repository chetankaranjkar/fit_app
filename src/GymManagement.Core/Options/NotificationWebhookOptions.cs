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

        /// <summary>
        /// When true, writes <c>Notifications</c> rows for members (mobile home + web dashboard). Runs independently of webhooks.
        /// </summary>
        public bool EnableInAppMembershipExpiryReminders { get; set; } = true;

        /// <summary>Delay between reminder scans.</summary>
        public int ReminderIntervalHours { get; set; } = 24;

        /// <summary>Include memberships whose end date falls within this many days from today (webhooks).</summary>
        public int MembershipExpiryReminderDays { get; set; } = 7;

        /// <summary>In-app member notifications window (milestones at 14, 7, 3, 1, 0 days).</summary>
        public int InAppMembershipExpiryReminderDays { get; set; } = 14;

        /// <summary>When true, sends Firebase push for in-app notification events (requires Firebase Admin credentials).</summary>
        public bool EnablePushNotifications { get; set; } = true;

        /// <summary>When true, creates daily workout-day in-app notifications (and push when enabled).</summary>
        public bool EnableWorkoutDayReminders { get; set; } = true;

        /// <summary>True when at least one outbound webhook URL is configured.</summary>
        public bool HasOutboundWebhook =>
            !string.IsNullOrWhiteSpace(EmailWebhookUrl) || !string.IsNullOrWhiteSpace(WhatsAppWebhookUrl);
    }
}
