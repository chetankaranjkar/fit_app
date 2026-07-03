using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Services.Notifications;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services;

/// <summary>
/// Outbound email facade — delegates to template engine + outbox queue.
/// Maintains backward-compatible method signatures for existing callers.
/// </summary>
public sealed class OutboundEmailService : IOutboundEmailService
{
    private readonly IEmailSettingsService _settings;
    private readonly IUserNotificationPreferenceService _preferences;
    private readonly INotificationContextBuilder _contextBuilder;
    private readonly INotificationComposerService _composer;
    private readonly INotificationOutboxService _outbox;
    private readonly IEmailTransportService _transport;
    private readonly ILogger<OutboundEmailService> _logger;

    public OutboundEmailService(
        IEmailSettingsService settings,
        IUserNotificationPreferenceService preferences,
        INotificationContextBuilder contextBuilder,
        INotificationComposerService composer,
        INotificationOutboxService outbox,
        IEmailTransportService transport,
        ILogger<OutboundEmailService> logger)
    {
        _settings = settings;
        _preferences = preferences;
        _contextBuilder = contextBuilder;
        _composer = composer;
        _outbox = outbox;
        _transport = transport;
        _logger = logger;
    }

    public async Task SendPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken ct = default)
    {
        var placeholders = NotificationContextBuilder.Merge(
            await _contextBuilder.BuildCommonAsync(ct),
            _contextBuilder.FromPaymentReceipt(dto));
        await EnqueueEmailAsync(
            NotificationTemplateCodes.PaymentSuccess,
            dto.UserId,
            dto.CustomerEmail,
            cfg => cfg.SendPaymentReceipts,
            placeholders,
            JsonSerializer.Serialize(dto),
            dto.AttachmentPaths,
            ct);
    }

    public async Task<SendNotificationChannelResultDto> TrySendPaymentReceiptAsync(
        PaymentReceiptNotificationDto dto,
        CancellationToken ct = default)
    {
        var cfg = await _settings.GetSmtpConfigAsync(ct);
        if (!cfg.IsConfigured)
            return Fail(EmailNotConfiguredMessage(cfg));
        if (!cfg.SendPaymentReceipts)
            return Fail("Payment receipt emails are disabled in Email settings.");
        if (!await _preferences.CanReceiveEmailAsync(dto.UserId, ct))
            return Fail("Member has email notifications turned off.");
        if (string.IsNullOrWhiteSpace(dto.CustomerEmail))
            return Fail("Member has no login email on file.");

        try
        {
            var placeholders = NotificationContextBuilder.Merge(
                await _contextBuilder.BuildCommonAsync(ct),
                _contextBuilder.FromPaymentReceipt(dto));
            var rendered = await _composer.ComposeAsync(
                NotificationTemplateCodes.PaymentSuccess,
                NotificationChannels.Email,
                placeholders,
                ct);
            var text = rendered.IsHtml ? StripHtml(rendered.Body) : rendered.Body;
            await _transport.SendAsync(
                dto.CustomerEmail.Trim(),
                rendered.Subject ?? "Payment receipt",
                text,
                rendered.IsHtml ? rendered.Body : null,
                null,
                ct);
            return Ok("Email sent.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Manual payment receipt email failed.");
            return Fail("Could not send email. Check SMTP settings.");
        }
    }

    public async Task<SendNotificationChannelResultDto> TrySendPaymentDueReminderAsync(
        PaymentDueReminderNotificationDto dto,
        CancellationToken ct = default)
    {
        var cfg = await _settings.GetSmtpConfigAsync(ct);
        if (!cfg.IsConfigured)
            return Fail(EmailNotConfiguredMessage(cfg));
        if (!cfg.SendPaymentReceipts)
            return Fail("Payment emails are disabled in Email settings.");
        if (!await _preferences.CanReceiveEmailAsync(dto.UserId, ct))
            return Fail("Member has email notifications turned off.");
        if (string.IsNullOrWhiteSpace(dto.CustomerEmail))
            return Fail("Member has no login email on file.");

        try
        {
            var placeholders = NotificationContextBuilder.Merge(
                await _contextBuilder.BuildCommonAsync(ct),
                _contextBuilder.FromPaymentDueReminder(dto));
            var rendered = await _composer.ComposeAsync(
                NotificationTemplateCodes.PaymentDueReminder,
                NotificationChannels.Email,
                placeholders,
                ct);
            var text = rendered.IsHtml ? StripHtml(rendered.Body) : rendered.Body;
            await _transport.SendAsync(
                dto.CustomerEmail.Trim(),
                rendered.Subject ?? "Payment reminder",
                text,
                rendered.IsHtml ? rendered.Body : null,
                null,
                ct);
            return Ok("Reminder email sent.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Manual payment due reminder email failed.");
            return Fail("Could not send email. Check SMTP settings.");
        }
    }

    public async Task SendMembershipExpiringAsync(MembershipExpiringNotificationDto dto, CancellationToken ct = default)
    {
        var code = dto.DaysRemaining <= 0
            ? NotificationTemplateCodes.MembershipExpired
            : NotificationTemplateCodes.MembershipRenewalReminder;
        var placeholders = NotificationContextBuilder.Merge(
            await _contextBuilder.BuildCommonAsync(ct),
            _contextBuilder.FromMembershipExpiring(dto));
        await EnqueueEmailAsync(
            code,
            dto.UserId,
            dto.MemberEmail,
            cfg => cfg.SendMembershipExpiryReminders,
            placeholders,
            JsonSerializer.Serialize(dto),
            null,
            ct);
    }

    public async Task SendDietAssignmentAssignedAsync(DietAssignmentAssignedNotificationDto dto, CancellationToken ct = default)
    {
        var placeholders = NotificationContextBuilder.Merge(
            await _contextBuilder.BuildCommonAsync(ct),
            _contextBuilder.FromDietAssignment(dto));
        await EnqueueEmailAsync(
            NotificationTemplateCodes.DietAssignmentAssigned,
            dto.UserId,
            dto.MemberEmail,
            cfg => cfg.SendDietAssignments,
            placeholders,
            JsonSerializer.Serialize(dto),
            null,
            ct);
    }

    public async Task SendTestEmailAsync(string toAddress, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(toAddress))
            throw new ArgumentException("Recipient email is required.");

        var cfg = await _settings.GetSmtpConfigAsync(ct);
        if (!cfg.IsConfigured)
            throw new InvalidOperationException(EmailNotConfiguredMessage(cfg));

        var placeholders = await _contextBuilder.BuildCommonAsync(ct);
        var rendered = await _composer.ComposeAsync(
            NotificationTemplateCodes.Welcome,
            NotificationChannels.Email,
            placeholders,
            ct);

        var text = rendered.IsHtml ? StripHtml(rendered.Body) : rendered.Body;
        await _transport.SendAsync(
            toAddress.Trim(),
            rendered.Subject ?? "Test email",
            text,
            rendered.IsHtml ? rendered.Body : null,
            null,
            ct);
    }

    private async Task EnqueueEmailAsync(
        string templateCode,
        int userId,
        string? recipient,
        Func<SmtpConnectionConfig, bool> isEventEnabled,
        IReadOnlyDictionary<string, string?> placeholders,
        string payloadJson,
        IReadOnlyList<string>? attachmentPaths,
        CancellationToken ct)
    {
        var cfg = await _settings.GetSmtpConfigAsync(ct);
        if (!cfg.IsConfigured || !isEventEnabled(cfg))
            return;

        if (!await _preferences.CanReceiveEmailAsync(userId, ct))
        {
            _logger.LogDebug("Email ({Template}) skipped: user {UserId} opt-out.", templateCode, userId);
            return;
        }

        if (string.IsNullOrWhiteSpace(recipient))
        {
            _logger.LogDebug("Email ({Template}) skipped: no recipient.", templateCode);
            return;
        }

        await _outbox.EnqueueAsync(new EnqueueNotificationRequest
        {
            TemplateCode = templateCode,
            Channel = NotificationChannels.Email,
            MemberId = userId,
            Recipient = recipient.Trim(),
            Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
            PayloadJson = payloadJson,
            AttachmentPaths = attachmentPaths,
        }, ct);
    }

    private static string EmailNotConfiguredMessage(SmtpConnectionConfig cfg)
    {
        if (cfg.PasswordStoredButUnreadable)
            return "SMTP app password could not be read. Re-enter your app password in Email settings and save.";
        return "Email not configured. Set up SMTP in Email settings.";
    }

    private static SendNotificationChannelResultDto Ok(string message) =>
        new() { Sent = true, Message = message };

    private static SendNotificationChannelResultDto Fail(string message) =>
        new() { Sent = false, Message = message };

    private static string StripHtml(string html) =>
        System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ").Trim();
}
