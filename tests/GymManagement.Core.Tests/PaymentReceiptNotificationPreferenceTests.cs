using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class PaymentReceiptNotificationPreferenceTests
{
    [Fact]
    public async Task Manual_email_receipt_is_blocked_when_member_email_notifications_are_off()
    {
        var transport = new RecordingEmailTransportService();
        var service = new OutboundEmailService(
            new ConfiguredEmailSettingsService(),
            new FixedNotificationPreferenceService(email: false, sms: true),
            new StubNotificationContextBuilder(),
            new StubNotificationComposerService(),
            new RecordingNotificationOutboxService(),
            transport,
            NullLogger<OutboundEmailService>.Instance);

        var result = await service.TrySendPaymentReceiptAsync(CreateReceipt());

        Assert.False(result.Sent);
        Assert.Equal("Member has email notifications turned off.", result.Message);
        Assert.Equal(0, transport.SendCount);
    }

    [Fact]
    public async Task Manual_email_receipt_sends_when_member_email_notifications_are_on()
    {
        var transport = new RecordingEmailTransportService();
        var service = new OutboundEmailService(
            new ConfiguredEmailSettingsService(),
            new FixedNotificationPreferenceService(email: true, sms: true),
            new StubNotificationContextBuilder(),
            new StubNotificationComposerService(),
            new RecordingNotificationOutboxService(),
            transport,
            NullLogger<OutboundEmailService>.Instance);

        var result = await service.TrySendPaymentReceiptAsync(CreateReceipt());

        Assert.True(result.Sent);
        Assert.Equal("Email sent.", result.Message);
        Assert.Equal(1, transport.SendCount);
    }

    [Fact]
    public async Task Manual_sms_receipt_is_blocked_when_member_sms_notifications_are_off()
    {
        var outbox = new RecordingNotificationOutboxService();
        var dispatcher = CreateDispatcher(
            outbox,
            new FixedNotificationPreferenceService(email: true, sms: false));

        var result = await dispatcher.SendPaymentReceiptManualAsync(CreateReceipt(), "sms");

        Assert.False(result.Sms.Sent);
        Assert.Equal("Member has SMS notifications turned off.", result.Sms.Message);
        Assert.Equal(0, outbox.EnqueueCount);
    }

    [Fact]
    public async Task Manual_sms_receipt_queues_when_member_sms_notifications_are_on()
    {
        var outbox = new RecordingNotificationOutboxService();
        var dispatcher = CreateDispatcher(
            outbox,
            new FixedNotificationPreferenceService(email: true, sms: true));

        var result = await dispatcher.SendPaymentReceiptManualAsync(CreateReceipt(), "sms");

        Assert.True(result.Sms.Sent);
        Assert.Equal("SMS/WhatsApp notification sent.", result.Sms.Message);
        Assert.Equal(1, outbox.EnqueueCount);
        Assert.Equal(NotificationChannels.Sms, outbox.LastRequest?.Channel);
        Assert.Equal("+919999999999", outbox.LastRequest?.Recipient);
    }

    [Fact]
    public async Task Membership_expiry_sms_queues_when_a_channel_allows_expiry_reminders()
    {
        var outbox = new RecordingNotificationOutboxService();
        var dispatcher = CreateDispatcher(
            outbox,
            new FixedNotificationPreferenceService(email: false, sms: true),
            new StubSmsTransportService(configured: true, allowsExpiry: true));

        await dispatcher.DispatchMembershipExpiringAsync(CreateExpiryReminder(daysRemaining: 7));

        Assert.Equal(1, outbox.EnqueueCount);
        Assert.Equal(NotificationTemplateCodes.MembershipRenewalReminder, outbox.LastRequest?.TemplateCode);
        Assert.Equal(NotificationChannels.Sms, outbox.LastRequest?.Channel);
        Assert.Equal("+919999999999", outbox.LastRequest?.Recipient);
    }

    [Fact]
    public async Task Membership_expiry_sms_is_not_queued_when_no_channel_allows_expiry_reminders()
    {
        var outbox = new RecordingNotificationOutboxService();
        var dispatcher = CreateDispatcher(
            outbox,
            new FixedNotificationPreferenceService(email: false, sms: true),
            new StubSmsTransportService(configured: true, allowsExpiry: false));

        await dispatcher.DispatchMembershipExpiringAsync(CreateExpiryReminder(daysRemaining: 7));

        Assert.Equal(0, outbox.EnqueueCount);
    }

    private static NotificationWebhookDispatcher CreateDispatcher(
        RecordingNotificationOutboxService outbox,
        IUserNotificationPreferenceService preferences,
        ISmsTransportService? smsTransport = null) =>
        new(
            new StubHttpClientFactory(),
            Microsoft.Extensions.Options.Options.Create(new NotificationWebhookOptions
            {
                WhatsAppWebhookUrl = "https://example.test/webhook",
            }),
            new StubOutboundEmailService(),
            outbox,
            new StubNotificationContextBuilder(),
            preferences,
            smsTransport ?? new StubSmsTransportService(),
            NullLogger<NotificationWebhookDispatcher>.Instance);

    private static PaymentReceiptNotificationDto CreateReceipt() => new()
    {
        UserId = 10008,
        CustomerEmail = "member@example.test",
        MemberPhone = "+919999999999",
        CustomerName = "Test Member",
        InvoiceNumber = "INV-001",
        ReceiptNo = "RCT-001",
        PaymentMode = "Cash",
        PaymentDateUtc = DateTime.UtcNow,
        TotalAmount = 1500m,
        PlanName = "Gold",
    };

    private static MembershipExpiringNotificationDto CreateExpiryReminder(int daysRemaining) => new()
    {
        UserId = 10008,
        MemberName = "Test Member",
        MemberEmail = "member@example.test",
        MemberPhone = "+919999999999",
        MembershipId = 42,
        PlanName = "Gold",
        EndDateUtc = DateTime.UtcNow.Date.AddDays(daysRemaining),
        DaysRemaining = daysRemaining,
    };

    private sealed class FixedNotificationPreferenceService : IUserNotificationPreferenceService
    {
        private readonly bool _email;
        private readonly bool _sms;

        public FixedNotificationPreferenceService(bool email, bool sms)
        {
            _email = email;
            _sms = sms;
        }

        public Task<bool> CanReceiveEmailAsync(int userId, CancellationToken ct = default) =>
            Task.FromResult(_email);

        public Task<bool> CanReceiveSmsAsync(int userId, CancellationToken ct = default) =>
            Task.FromResult(_sms);
    }

    private sealed class ConfiguredEmailSettingsService : IEmailSettingsService
    {
        public Task<EmailSettingsDto> GetAsync(CancellationToken ct = default) => Task.FromResult(new EmailSettingsDto());

        public Task<EmailSettingsDto> UpdateAsync(UpdateEmailSettingsDto dto, CancellationToken ct = default) =>
            Task.FromResult(new EmailSettingsDto());

        public Task<SmtpConnectionConfig> GetSmtpConfigAsync(CancellationToken ct = default) =>
            Task.FromResult(new SmtpConnectionConfig
            {
                Enabled = true,
                Host = "smtp.example.test",
                Port = 587,
                Username = "user",
                Password = "password",
                FromAddress = "gym@example.test",
                SendPaymentReceipts = true,
            });
    }

    private sealed class StubNotificationContextBuilder : INotificationContextBuilder
    {
        public Task<IReadOnlyDictionary<string, string?>> BuildCommonAsync(CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyDictionary<string, string?>>(new Dictionary<string, string?>
            {
                ["GymName"] = "Test Gym",
            });

        public IReadOnlyDictionary<string, string?> FromPaymentReceipt(PaymentReceiptNotificationDto dto) =>
            new Dictionary<string, string?>
            {
                ["MemberName"] = dto.CustomerName,
                ["ReceiptNumber"] = dto.ReceiptNo,
                ["Amount"] = dto.TotalAmount.ToString("N2"),
            };

        public IReadOnlyDictionary<string, string?> FromMembershipExpiring(MembershipExpiringNotificationDto dto) =>
            new Dictionary<string, string?>();

        public IReadOnlyDictionary<string, string?> FromDietAssignment(DietAssignmentAssignedNotificationDto dto) =>
            new Dictionary<string, string?>();
    }

    private sealed class StubNotificationComposerService : INotificationComposerService
    {
        public Task<RenderedNotificationDto> ComposeAsync(
            string templateCode,
            string channel,
            IReadOnlyDictionary<string, string?> placeholders,
            CancellationToken ct = default) =>
            Task.FromResult(new RenderedNotificationDto
            {
                Subject = "Payment receipt",
                Body = "Payment received",
                IsHtml = false,
            });
    }

    private sealed class RecordingNotificationOutboxService : INotificationOutboxService
    {
        public int EnqueueCount { get; private set; }
        public EnqueueNotificationRequest? LastRequest { get; private set; }

        public Task<int> EnqueueAsync(EnqueueNotificationRequest request, CancellationToken ct = default)
        {
            EnqueueCount++;
            LastRequest = request;
            return Task.FromResult(EnqueueCount);
        }

        public Task ProcessPendingAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class RecordingEmailTransportService : IEmailTransportService
    {
        public int SendCount { get; private set; }

        public Task SendAsync(
            string to,
            string subject,
            string textBody,
            string? htmlBody,
            IReadOnlyList<string>? attachmentPaths,
            CancellationToken ct = default)
        {
            SendCount++;
            return Task.CompletedTask;
        }
    }

    private sealed class StubOutboundEmailService : IOutboundEmailService
    {
        public Task SendPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<SendNotificationChannelResultDto> TrySendPaymentReceiptAsync(
            PaymentReceiptNotificationDto dto,
            CancellationToken ct = default) =>
            Task.FromResult(new SendNotificationChannelResultDto { Sent = true });

        public Task SendMembershipExpiringAsync(MembershipExpiringNotificationDto dto, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task SendDietAssignmentAssignedAsync(DietAssignmentAssignedNotificationDto dto, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task SendTestEmailAsync(string toAddress, CancellationToken ct = default) =>
            Task.CompletedTask;
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    private sealed class StubSmsTransportService : ISmsTransportService
    {
        private readonly bool _configured;
        private readonly bool _allowsExpiry;

        public StubSmsTransportService(bool configured = true, bool allowsExpiry = true)
        {
            _configured = configured;
            _allowsExpiry = allowsExpiry;
        }

        public Task<bool> IsConfiguredAsync(CancellationToken ct = default) => Task.FromResult(_configured);

        public Task<bool> AllowsExpiryRemindersAsync(CancellationToken ct = default) =>
            Task.FromResult(_configured && _allowsExpiry);

        public Task SendAsync(
            string toPhone,
            string message,
            int? memberId = null,
            string? eventType = null,
            CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task SendTestAsync(string channel, string toPhone, CancellationToken ct = default) =>
            Task.CompletedTask;
    }
}
