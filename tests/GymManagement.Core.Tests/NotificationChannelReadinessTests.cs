using GymManagement.Core.Notifications;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class NotificationChannelReadinessTests
{
    [Fact]
    public void Email_disabled_with_missing_host_is_disabled_not_ready()
    {
        var result = NotificationChannelReadiness.ForEmail(
            enabled: false,
            smtpHost: null,
            smtpPort: 587,
            smtpUsername: "a@b.com",
            hasReadablePassword: true,
            passwordNeedsReentry: false,
            fromAddress: "a@b.com");

        Assert.Equal(NotificationChannelReadinessStates.Disabled, result.Readiness);
        Assert.Contains("SMTP host missing", result.BlockingReasons);
        Assert.False(result.IsReady);
    }

    [Fact]
    public void Email_enabled_without_password_is_unconfigured()
    {
        var result = NotificationChannelReadiness.ForEmail(
            enabled: true,
            smtpHost: "smtp.gmail.com",
            smtpPort: 587,
            smtpUsername: "a@b.com",
            hasReadablePassword: false,
            passwordNeedsReentry: false,
            fromAddress: "a@b.com");

        Assert.Equal(NotificationChannelReadinessStates.Unconfigured, result.Readiness);
        Assert.Contains("SMTP password missing", result.BlockingReasons);
    }

    [Fact]
    public void Email_complete_and_enabled_is_ready()
    {
        var result = NotificationChannelReadiness.ForEmail(
            enabled: true,
            smtpHost: "smtp.gmail.com",
            smtpPort: 587,
            smtpUsername: "a@b.com",
            hasReadablePassword: true,
            passwordNeedsReentry: false,
            fromAddress: "gym@example.com");

        Assert.Equal(NotificationChannelReadinessStates.Ready, result.Readiness);
        Assert.Empty(result.BlockingReasons);
    }

    [Fact]
    public void WhatsApp_enabled_without_url_is_unconfigured()
    {
        var result = NotificationChannelReadiness.ForWebhookChannel(true, null, "WhatsApp");
        Assert.Equal(NotificationChannelReadinessStates.Unconfigured, result.Readiness);
        Assert.Contains("WhatsApp not configured", result.BlockingReasons);
    }

    [Fact]
    public void Push_enabled_without_admin_credentials_is_unconfigured()
    {
        var result = NotificationChannelReadiness.ForPush(true, firebaseEnabled: true, hasAdminCredentials: false);
        Assert.Equal(NotificationChannelReadinessStates.Unconfigured, result.Readiness);
        Assert.Contains("Push key missing", result.BlockingReasons);
    }

    [Fact]
    public void Outbox_pending_with_retries_is_retrying()
    {
        Assert.Equal(
            NotificationDeliveryDisplayStatuses.Queued,
            NotificationDeliveryDisplay.FromOutbox(NotificationOutboxStatuses.Pending, 0));
        Assert.Equal(
            NotificationDeliveryDisplayStatuses.Retrying,
            NotificationDeliveryDisplay.FromOutbox(NotificationOutboxStatuses.Pending, 1));
        Assert.Equal(
            NotificationDeliveryDisplayStatuses.Retrying,
            NotificationDeliveryDisplay.FromOutbox(NotificationOutboxStatuses.Processing, 0));
        Assert.Equal(
            NotificationDeliveryDisplayStatuses.Sent,
            NotificationDeliveryDisplay.FromOutbox(NotificationOutboxStatuses.Sent, 0));
        Assert.Equal(
            NotificationDeliveryDisplayStatuses.Failed,
            NotificationDeliveryDisplay.FromOutbox(NotificationOutboxStatuses.Failed, 3));
    }

    [Fact]
    public void Sanitizer_redacts_tokens_and_passwords()
    {
        var raw = "SMTP failed password=SuperSecret123 Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig Authorization: tok-abc";
        var cleaned = NotificationDeliveryErrorSanitizer.Sanitize(raw);
        Assert.NotNull(cleaned);
        Assert.DoesNotContain("SuperSecret123", cleaned);
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiJ9", cleaned);
        Assert.DoesNotContain("tok-abc", cleaned);
        Assert.Contains("[redacted]", cleaned);
    }
}
