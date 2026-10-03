namespace GymManagement.Core.Notifications;

public static class NotificationDeliveryDisplayStatuses
{
    public const string Queued = "Queued";
    public const string Retrying = "Retrying";
    public const string Sent = "Sent";
    public const string Failed = "Failed";
    public const string Skipped = "Skipped";
}

/// <summary>Maps outbox/history rows to staff-facing delivery states.</summary>
public static class NotificationDeliveryDisplay
{
    public static string FromOutbox(string status, int retryCount)
    {
        if (string.Equals(status, NotificationOutboxStatuses.Sent, StringComparison.OrdinalIgnoreCase))
            return NotificationDeliveryDisplayStatuses.Sent;
        if (string.Equals(status, NotificationOutboxStatuses.Failed, StringComparison.OrdinalIgnoreCase))
            return NotificationDeliveryDisplayStatuses.Failed;
        if (string.Equals(status, NotificationOutboxStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
            return NotificationDeliveryDisplayStatuses.Skipped;
        if (string.Equals(status, NotificationOutboxStatuses.Processing, StringComparison.OrdinalIgnoreCase)
            || retryCount > 0)
            return NotificationDeliveryDisplayStatuses.Retrying;
        return NotificationDeliveryDisplayStatuses.Queued;
    }

    public static string FromHistory(string status)
    {
        if (string.Equals(status, NotificationHistoryStatuses.Sent, StringComparison.OrdinalIgnoreCase))
            return NotificationDeliveryDisplayStatuses.Sent;
        if (string.Equals(status, NotificationHistoryStatuses.Skipped, StringComparison.OrdinalIgnoreCase))
            return NotificationDeliveryDisplayStatuses.Skipped;
        if (string.Equals(status, NotificationHistoryStatuses.Failed, StringComparison.OrdinalIgnoreCase))
            return NotificationDeliveryDisplayStatuses.Failed;
        return status;
    }
}
