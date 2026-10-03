namespace GymManagement.Core.Notifications;

public static class NotificationChannelReadinessStates
{
    public const string Disabled = "Disabled";
    public const string Unconfigured = "Unconfigured";
    public const string Ready = "Ready";
}

public readonly record struct NotificationChannelReadinessResult(string Readiness, IReadOnlyList<string> BlockingReasons)
{
    public bool IsReady => Readiness == NotificationChannelReadinessStates.Ready;
}

/// <summary>Staff-facing channel status without secret values.</summary>
public static class NotificationChannelReadiness
{
    public static NotificationChannelReadinessResult ForEmail(
        bool enabled,
        string? smtpHost,
        int smtpPort,
        string? smtpUsername,
        bool hasReadablePassword,
        bool passwordNeedsReentry,
        string? fromAddress)
    {
        var reasons = new List<string>();
        if (string.IsNullOrWhiteSpace(smtpHost))
            reasons.Add("SMTP host missing");
        if (smtpPort is < 1 or > 65535)
            reasons.Add("SMTP port is invalid");
        if (string.IsNullOrWhiteSpace(smtpUsername))
            reasons.Add("SMTP username missing");
        if (passwordNeedsReentry)
            reasons.Add("SMTP password needs re-entry");
        else if (!hasReadablePassword)
            reasons.Add("SMTP password missing");
        if (string.IsNullOrWhiteSpace(fromAddress))
            reasons.Add("From email missing");

        return Finish(enabled, reasons);
    }

    public static NotificationChannelReadinessResult ForWebhookChannel(
        bool enabled,
        string? webhookUrl,
        string channelLabel)
    {
        var reasons = new List<string>();
        if (string.IsNullOrWhiteSpace(webhookUrl))
            reasons.Add($"{channelLabel} not configured");
        else if (!Uri.TryCreate(webhookUrl.Trim(), UriKind.Absolute, out var uri)
                 || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            reasons.Add($"{channelLabel} webhook URL must be http or https");

        return Finish(enabled, reasons);
    }

    public static NotificationChannelReadinessResult ForInApp(bool enabled) =>
        enabled
            ? new(NotificationChannelReadinessStates.Ready, Array.Empty<string>())
            : new(NotificationChannelReadinessStates.Disabled, new[] { "In-app notifications are disabled on the server." });

    public static NotificationChannelReadinessResult ForPush(bool enabled, bool firebaseEnabled, bool hasAdminCredentials)
    {
        if (!enabled)
            return new(NotificationChannelReadinessStates.Disabled, new[] { "Push notifications are disabled on the server." });

        var reasons = new List<string>();
        if (!firebaseEnabled)
            reasons.Add("Firebase is not enabled");
        if (!hasAdminCredentials)
            reasons.Add("Push key missing");

        return Finish(enabled: true, reasons);
    }

    private static NotificationChannelReadinessResult Finish(bool enabled, List<string> reasons)
    {
        if (!enabled)
            return new(NotificationChannelReadinessStates.Disabled, reasons);
        if (reasons.Count > 0)
            return new(NotificationChannelReadinessStates.Unconfigured, reasons);
        return new(NotificationChannelReadinessStates.Ready, Array.Empty<string>());
    }
}
