using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Services.Notifications;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services
{
    public sealed class NotificationWebhookDispatcher : INotificationWebhookDispatcher
    {
        private const string HttpClientName = "notification-webhooks";

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IOptions<NotificationWebhookOptions> _options;
        private readonly IOutboundEmailService _outboundEmail;
        private readonly INotificationOutboxService _outbox;
        private readonly INotificationContextBuilder _contextBuilder;
        private readonly IUserNotificationPreferenceService _preferences;
        private readonly ISmsTransportService _smsTransport;
        private readonly ILogger<NotificationWebhookDispatcher> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public NotificationWebhookDispatcher(
            IHttpClientFactory httpClientFactory,
            IOptions<NotificationWebhookOptions> options,
            IOutboundEmailService outboundEmail,
            INotificationOutboxService outbox,
            INotificationContextBuilder contextBuilder,
            IUserNotificationPreferenceService preferences,
            ISmsTransportService smsTransport,
            ILogger<NotificationWebhookDispatcher> logger)
        {
            _httpClientFactory = httpClientFactory;
            _options = options;
            _outboundEmail = outboundEmail;
            _outbox = outbox;
            _contextBuilder = contextBuilder;
            _preferences = preferences;
            _smsTransport = smsTransport;
            _logger = logger;
        }

        public async Task DispatchPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken cancellationToken = default)
        {
            var opts = _options.Value;
            try
            {
                var canEmail = await _preferences.CanReceiveEmailAsync(dto.UserId, cancellationToken).ConfigureAwait(false);
                var canSms = await _preferences.CanReceiveSmsAsync(dto.UserId, cancellationToken).ConfigureAwait(false);

                if (canEmail)
                {
                    await _outboundEmail.SendPaymentReceiptAsync(dto, cancellationToken).ConfigureAwait(false);
                    await PostEnvelopeAsync("email", opts.EmailWebhookUrl, NotificationWebhookEventTypes.PaymentReceipt, dto, opts, cancellationToken)
                        .ConfigureAwait(false);
                }
                if (canSms
                    && !string.IsNullOrWhiteSpace(dto.MemberPhone)
                    && await _smsTransport.IsConfiguredAsync(cancellationToken).ConfigureAwait(false))
                {
                    var placeholders = NotificationContextBuilder.Merge(
                        await _contextBuilder.BuildCommonAsync(cancellationToken).ConfigureAwait(false),
                        _contextBuilder.FromPaymentReceipt(dto));
                    await _outbox.EnqueueAsync(new EnqueueNotificationRequest
                    {
                        TemplateCode = NotificationTemplateCodes.PaymentSuccess,
                        Channel = NotificationChannels.Sms,
                        MemberId = dto.UserId,
                        Recipient = dto.MemberPhone.Trim(),
                        Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
                        PayloadJson = JsonSerializer.Serialize(dto, JsonOptions),
                    }, cancellationToken).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching payment receipt webhooks.");
            }
        }

        public async Task<SendPaymentReceiptResultDto> SendPaymentReceiptManualAsync(
            PaymentReceiptNotificationDto dto,
            string channel,
            CancellationToken cancellationToken = default)
        {
            var normalized = string.IsNullOrWhiteSpace(channel) ? "both" : channel.Trim().ToLowerInvariant();
            var sendEmail = normalized is "email" or "both";
            var sendSms = normalized is "sms" or "both";
            var result = new SendPaymentReceiptResultDto();

            if (sendEmail)
                result.Email = await _outboundEmail.TrySendPaymentReceiptAsync(dto, cancellationToken).ConfigureAwait(false);

            if (sendSms)
            {
                if (!await _preferences.CanReceiveSmsAsync(dto.UserId, cancellationToken).ConfigureAwait(false))
                {
                    result.Sms = new SendNotificationChannelResultDto
                    {
                        Sent = false,
                        Message = "Member has SMS notifications turned off.",
                    };
                }
                else if (string.IsNullOrWhiteSpace(dto.MemberPhone))
                {
                    result.Sms = new SendNotificationChannelResultDto
                    {
                        Sent = false,
                        Message = "Member has no phone number on file.",
                    };
                }
                else if (!await _smsTransport.IsConfiguredAsync(cancellationToken).ConfigureAwait(false))
                {
                    result.Sms = new SendNotificationChannelResultDto
                    {
                        Sent = false,
                        Message = "WhatsApp/SMS webhook is not configured. Set it up in SMS settings.",
                    };
                }
                else
                {
                    try
                    {
                        var placeholders = NotificationContextBuilder.Merge(
                            await _contextBuilder.BuildCommonAsync(cancellationToken).ConfigureAwait(false),
                            _contextBuilder.FromPaymentReceipt(dto));
                        await _outbox.EnqueueAsync(new EnqueueNotificationRequest
                        {
                            TemplateCode = NotificationTemplateCodes.PaymentSuccess,
                            Channel = NotificationChannels.Sms,
                            MemberId = dto.UserId,
                            Recipient = dto.MemberPhone!.Trim(),
                            Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
                            PayloadJson = JsonSerializer.Serialize(dto, JsonOptions),
                            SendImmediately = true,
                        }, cancellationToken).ConfigureAwait(false);
                        result.Sms = new SendNotificationChannelResultDto
                        {
                            Sent = true,
                            Message = "SMS/WhatsApp notification sent.",
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Manual payment receipt SMS webhook failed for user {UserId}.", dto.UserId);
                        result.Sms = new SendNotificationChannelResultDto
                        {
                            Sent = false,
                            Message = "Could not send SMS/WhatsApp notification.",
                        };
                    }
                }
            }

            return result;
        }

        public async Task<SendPaymentReceiptResultDto> SendPaymentDueReminderManualAsync(
            PaymentDueReminderNotificationDto dto,
            string channel,
            CancellationToken cancellationToken = default)
        {
            var normalized = string.IsNullOrWhiteSpace(channel) ? "both" : channel.Trim().ToLowerInvariant();
            var sendEmail = normalized is "email" or "both";
            var sendSms = normalized is "sms" or "both";
            var result = new SendPaymentReceiptResultDto();

            if (sendEmail)
                result.Email = await _outboundEmail.TrySendPaymentDueReminderAsync(dto, cancellationToken).ConfigureAwait(false);

            if (sendSms)
            {
                if (!await _preferences.CanReceiveSmsAsync(dto.UserId, cancellationToken).ConfigureAwait(false))
                {
                    result.Sms = new SendNotificationChannelResultDto
                    {
                        Sent = false,
                        Message = "Member has SMS notifications turned off.",
                    };
                }
                else if (string.IsNullOrWhiteSpace(dto.MemberPhone))
                {
                    result.Sms = new SendNotificationChannelResultDto
                    {
                        Sent = false,
                        Message = "Member has no phone number on file.",
                    };
                }
                else if (!await _smsTransport.IsConfiguredAsync(cancellationToken).ConfigureAwait(false))
                {
                    result.Sms = new SendNotificationChannelResultDto
                    {
                        Sent = false,
                        Message = "WhatsApp/SMS webhook is not configured. Set it up in SMS settings.",
                    };
                }
                else
                {
                    try
                    {
                        var placeholders = NotificationContextBuilder.Merge(
                            await _contextBuilder.BuildCommonAsync(cancellationToken).ConfigureAwait(false),
                            _contextBuilder.FromPaymentDueReminder(dto));
                        await _outbox.EnqueueAsync(new EnqueueNotificationRequest
                        {
                            TemplateCode = NotificationTemplateCodes.PaymentDueReminder,
                            Channel = NotificationChannels.Sms,
                            MemberId = dto.UserId,
                            Recipient = dto.MemberPhone!.Trim(),
                            Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
                            PayloadJson = JsonSerializer.Serialize(dto, JsonOptions),
                            SendImmediately = true,
                        }, cancellationToken).ConfigureAwait(false);
                        result.Sms = new SendNotificationChannelResultDto
                        {
                            Sent = true,
                            Message = "Payment reminder sent via SMS/WhatsApp.",
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Manual payment due reminder SMS failed for user {UserId}.", dto.UserId);
                        result.Sms = new SendNotificationChannelResultDto
                        {
                            Sent = false,
                            Message = "Could not send SMS/WhatsApp notification.",
                        };
                    }
                }
            }

            return result;
        }

        public async Task DispatchMembershipExpiringAsync(MembershipExpiringNotificationDto dto, CancellationToken cancellationToken = default)
        {
            var opts = _options.Value;
            try
            {
                var canEmail = await _preferences.CanReceiveEmailAsync(dto.UserId, cancellationToken).ConfigureAwait(false);
                var canSms = await _preferences.CanReceiveSmsAsync(dto.UserId, cancellationToken).ConfigureAwait(false);

                if (canEmail)
                {
                    await _outboundEmail.SendMembershipExpiringAsync(dto, cancellationToken).ConfigureAwait(false);
                    await PostEnvelopeAsync("email", opts.EmailWebhookUrl, NotificationWebhookEventTypes.MembershipExpiring, dto, opts, cancellationToken)
                        .ConfigureAwait(false);
                }
                if (canSms)
                {
                    if (await _smsTransport.AllowsExpiryRemindersAsync(cancellationToken).ConfigureAwait(false)
                        && !string.IsNullOrWhiteSpace(dto.MemberPhone))
                    {
                        var code = dto.DaysRemaining <= 0
                            ? NotificationTemplateCodes.MembershipExpired
                            : NotificationTemplateCodes.MembershipRenewalReminder;
                        var placeholders = NotificationContextBuilder.Merge(
                            await _contextBuilder.BuildCommonAsync(cancellationToken).ConfigureAwait(false),
                            _contextBuilder.FromMembershipExpiring(dto));
                        await _outbox.EnqueueAsync(new EnqueueNotificationRequest
                        {
                            TemplateCode = code,
                            Channel = NotificationChannels.Sms,
                            MemberId = dto.UserId,
                            Recipient = dto.MemberPhone.Trim(),
                            Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
                            PayloadJson = JsonSerializer.Serialize(dto, JsonOptions),
                        }, cancellationToken).ConfigureAwait(false);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching membership expiry webhooks.");
            }
        }

        public async Task DispatchDietAssignmentAssignedAsync(
            DietAssignmentAssignedNotificationDto dto,
            CancellationToken cancellationToken = default)
        {
            var opts = _options.Value;
            try
            {
                var canEmail = await _preferences.CanReceiveEmailAsync(dto.UserId, cancellationToken).ConfigureAwait(false);
                var canSms = await _preferences.CanReceiveSmsAsync(dto.UserId, cancellationToken).ConfigureAwait(false);

                if (canEmail)
                {
                    await _outboundEmail.SendDietAssignmentAssignedAsync(dto, cancellationToken).ConfigureAwait(false);
                    await PostEnvelopeAsync(
                            "email",
                            opts.EmailWebhookUrl,
                            NotificationWebhookEventTypes.DietAssignmentAssigned,
                            dto,
                            opts,
                            cancellationToken)
                        .ConfigureAwait(false);
                }
                if (canSms)
                {
                    if (await _smsTransport.IsConfiguredAsync(cancellationToken).ConfigureAwait(false)
                        && !string.IsNullOrWhiteSpace(dto.MemberPhone))
                    {
                        var placeholders = NotificationContextBuilder.Merge(
                            await _contextBuilder.BuildCommonAsync(cancellationToken).ConfigureAwait(false),
                            _contextBuilder.FromDietAssignment(dto));
                        await _outbox.EnqueueAsync(new EnqueueNotificationRequest
                        {
                            TemplateCode = NotificationTemplateCodes.DietAssignmentAssigned,
                            Channel = NotificationChannels.Sms,
                            MemberId = dto.UserId,
                            Recipient = dto.MemberPhone.Trim(),
                            Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
                            PayloadJson = JsonSerializer.Serialize(dto, JsonOptions),
                        }, cancellationToken).ConfigureAwait(false);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error dispatching diet assignment webhooks.");
            }
        }

        private async Task PostEnvelopeAsync(
            string channel,
            string? url,
            string eventType,
            object data,
            NotificationWebhookOptions opts,
            CancellationToken cancellationToken)
        {
            var envelope = new
            {
                eventType,
                channel,
                occurredAtUtc = DateTime.UtcNow,
                data,
            };
            await PostAsync(channel, url, envelope, opts, cancellationToken).ConfigureAwait(false);
        }

        private async Task PostAsync(
            string channel,
            string? url,
            object envelope,
            NotificationWebhookOptions opts,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                _logger.LogDebug("Notification webhook ({Channel}): URL not configured; skipped.", channel);
                return;
            }

            var client = _httpClientFactory.CreateClient(HttpClientName);
            var json = JsonSerializer.Serialize(envelope, JsonOptions);
            var max = Math.Max(1, opts.MaxRetries);
            var delayMs = 500;

            for (var attempt = 1; attempt <= max; attempt++)
            {
                try
                {
                    using var content = new StringContent(json, Encoding.UTF8, "application/json");
                    content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

                    using var response = await client.PostAsync(url, content, cancellationToken).ConfigureAwait(false);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation(
                            "Notification webhook ({Channel}) delivered: {Status} (attempt {Attempt}/{Max}).",
                            channel,
                            (int)response.StatusCode,
                            attempt,
                            max);
                        return;
                    }

                    if ((int)response.StatusCode >= 500 || response.StatusCode == HttpStatusCode.RequestTimeout)
                    {
                        _logger.LogWarning(
                            "Notification webhook ({Channel}) transient failure: {Status} (attempt {Attempt}/{Max}).",
                            channel,
                            (int)response.StatusCode,
                            attempt,
                            max);
                    }
                    else
                    {
                        var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                        _logger.LogWarning(
                            "Notification webhook ({Channel}) non-retryable response: {Status} — {Body}",
                            channel,
                            (int)response.StatusCode,
                            body.Length > 500 ? body[..500] + "…" : body);
                        return;
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Notification webhook ({Channel}) request failed (attempt {Attempt}/{Max}).",
                        channel,
                        attempt,
                        max);
                }

                if (attempt < max)
                    await Task.Delay(delayMs, cancellationToken).ConfigureAwait(false);
                delayMs = Math.Min(delayMs * 2, 8000);
            }

            _logger.LogError("Notification webhook ({Channel}) failed after {Max} attempts.", channel, max);
        }
    }
}
