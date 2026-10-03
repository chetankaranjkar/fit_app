using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Configuration;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationChannelStatusService : INotificationChannelStatusService
{
    private readonly IEmailSettingsService _email;
    private readonly ISmsSettingsService _sms;
    private readonly ApplicationDbContext _db;
    private readonly NotificationWebhookOptions _notifications;
    private readonly FirebaseOptions _firebase;

    public NotificationChannelStatusService(
        IEmailSettingsService email,
        ISmsSettingsService sms,
        ApplicationDbContext db,
        IOptions<NotificationWebhookOptions> notifications,
        IOptions<FirebaseOptions> firebase)
    {
        _email = email;
        _sms = sms;
        _db = db;
        _notifications = notifications.Value;
        _firebase = firebase.Value;
    }

    public async Task<NotificationChannelsOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var email = await _email.GetAsync(ct);
        var text = await _sms.GetAsync(ct);
        var deviceCount = await _db.UserDevices.AsNoTracking()
            .CountAsync(d => d.IsActive && !d.IsDeleted && d.FcmToken != null && d.FcmToken != "", ct);

        var inAppEnabled = _notifications.EnableInAppMembershipExpiryReminders
            || _notifications.EnableWorkoutDayReminders;
        var inApp = NotificationChannelReadiness.ForInApp(inAppEnabled);
        var push = NotificationChannelReadiness.ForPush(
            _notifications.EnablePushNotifications,
            _firebase.Enabled,
            _firebase.HasAdminCredentials);

        return new NotificationChannelsOverviewDto
        {
            Channels =
            [
                Map(
                    "email",
                    "Email",
                    email.Readiness,
                    email.BlockingReasons,
                    EmailSummary(email),
                    "/dashboard/settings/email",
                    email.HasPasswordConfigured),
                Map(
                    "sms",
                    "SMS",
                    text.Sms.Readiness,
                    text.Sms.BlockingReasons,
                    WebhookSummary("SMS", text.Sms),
                    "/dashboard/settings/sms",
                    text.Sms.HasAuthHeaderConfigured),
                Map(
                    "whatsapp",
                    "WhatsApp",
                    text.WhatsApp.Readiness,
                    text.WhatsApp.BlockingReasons,
                    WebhookSummary("WhatsApp", text.WhatsApp),
                    "/dashboard/settings/sms",
                    text.WhatsApp.HasAuthHeaderConfigured),
                Map(
                    "inapp",
                    "In-app",
                    inApp.Readiness,
                    inApp.BlockingReasons,
                    InAppSummary(inAppEnabled),
                    null,
                    false),
                Map(
                    "push",
                    "Push",
                    push.Readiness,
                    push.BlockingReasons,
                    PushSummary(push.Readiness, deviceCount),
                    null,
                    _firebase.HasAdminCredentials),
            ],
        };
    }

    private static NotificationChannelStatusDto Map(
        string channel,
        string label,
        string readiness,
        IEnumerable<string> reasons,
        string summary,
        string? path,
        bool secretConfigured) =>
        new()
        {
            Channel = channel,
            Label = label,
            Readiness = string.IsNullOrWhiteSpace(readiness)
                ? NotificationChannelReadinessStates.Unconfigured
                : readiness,
            BlockingReasons = reasons.ToList(),
            Summary = summary,
            SettingsPath = path,
            SecretConfigured = secretConfigured,
        };

    private static string EmailSummary(EmailSettingsDto email)
    {
        if (email.Readiness == NotificationChannelReadinessStates.Ready)
            return "SMTP is ready. Payment receipts and other emails still require member email opt-in.";
        if (email.Readiness == NotificationChannelReadinessStates.Disabled)
            return email.BlockingReasons.Count > 0
                ? "Email is disabled. " + string.Join(". ", email.BlockingReasons) + "."
                : "Email is disabled. Enable outbound email after SMTP is filled in.";
        return "Email is unconfigured. " + string.Join(". ", email.BlockingReasons) + ".";
    }

    private static string WebhookSummary(string label, SmsChannelSettingsDto channel)
    {
        if (channel.Readiness == NotificationChannelReadinessStates.Ready)
            return $"{label} webhook is ready. Members still need SMS/WhatsApp opt-in.";
        if (channel.Readiness == NotificationChannelReadinessStates.Disabled)
            return channel.BlockingReasons.Count > 0
                ? $"{label} is disabled. " + string.Join(". ", channel.BlockingReasons) + "."
                : $"{label} is disabled.";
        return $"{label} is unconfigured. " + string.Join(". ", channel.BlockingReasons) + ".";
    }

    private string InAppSummary(bool enabled)
    {
        if (!enabled)
            return "In-app membership and workout reminders are disabled in server Notifications settings.";
        return $"In-app alerts write to the member dashboard and mobile inbox (expiry window {_notifications.InAppMembershipExpiryReminderDays} days). They do not use email/SMS opt-in.";
    }

    private static string PushSummary(string readiness, int deviceCount)
    {
        var devices = deviceCount == 1
            ? "1 member device token is registered."
            : $"{deviceCount} member device tokens are registered.";
        var gym = readiness == NotificationChannelReadinessStates.Ready
            ? "Gym-level Firebase Admin is ready."
            : readiness == NotificationChannelReadinessStates.Disabled
                ? "Gym-level push is disabled."
                : "Gym-level Firebase Admin is unconfigured.";
        return $"{gym} {devices} Device tokens are stored per member and are never shown here. Push is separate from email/SMS opt-in.";
    }
}
