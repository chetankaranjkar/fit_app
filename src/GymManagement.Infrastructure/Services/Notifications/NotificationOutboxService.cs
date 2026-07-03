using System.Diagnostics;
using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationOutboxService : INotificationOutboxService
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationComposerService _composer;
    private readonly IEmailTransportService _emailTransport;
    private readonly ISmsTransportService _smsTransport;
    private readonly INotificationHistoryService _history;
    private readonly ILogger<NotificationOutboxService> _logger;

    public NotificationOutboxService(
        ApplicationDbContext db,
        INotificationComposerService composer,
        IEmailTransportService emailTransport,
        ISmsTransportService smsTransport,
        INotificationHistoryService history,
        ILogger<NotificationOutboxService> logger)
    {
        _db = db;
        _composer = composer;
        _emailTransport = emailTransport;
        _smsTransport = smsTransport;
        _history = history;
        _logger = logger;
    }

    public async Task<int> EnqueueAsync(EnqueueNotificationRequest request, CancellationToken ct = default)
    {
        var rendered = await _composer.ComposeAsync(
            request.TemplateCode,
            request.Channel,
            request.Placeholders,
            ct);

        var row = new NotificationOutbox
        {
            TemplateCode = request.TemplateCode,
            NotificationType = request.TemplateCode,
            Channel = request.Channel,
            MemberId = request.MemberId,
            Recipient = request.Recipient,
            Subject = rendered.Subject,
            Body = rendered.Body,
            IsHtml = rendered.IsHtml,
            Status = NotificationOutboxStatuses.Pending,
            PayloadJson = request.PayloadJson,
            AttachmentPathsJson = request.AttachmentPaths != null
                ? JsonSerializer.Serialize(request.AttachmentPaths)
                : null,
            CreatedByUserId = request.CreatedByUserId,
            ScheduledForUtc = DateTime.UtcNow,
        };

        await _db.NotificationOutboxes.AddAsync(row, ct);
        await _db.SaveChangesAsync(ct);

        if (request.SendImmediately)
            await DispatchOneAsync(row, ct);

        return row.Id;
    }

    public async Task ProcessPendingAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var batch = await _db.NotificationOutboxes
            .Where(o => !o.IsDeleted
                        && o.Status == NotificationOutboxStatuses.Pending
                        && (o.ScheduledForUtc == null || o.ScheduledForUtc <= now))
            .OrderBy(o => o.CreatedDate)
            .Take(20)
            .ToListAsync(ct);

        foreach (var item in batch)
            await DispatchOneAsync(item, ct);
    }

    private async Task DispatchOneAsync(NotificationOutbox item, CancellationToken ct)
    {
        item.Status = NotificationOutboxStatuses.Processing;
        await _db.SaveChangesAsync(ct);

        var sw = Stopwatch.StartNew();
        try
        {
            if (item.Channel == NotificationChannels.Email)
            {
                var text = item.IsHtml ? StripHtml(item.Body) : item.Body;
                var attachments = ParseAttachments(item.AttachmentPathsJson);
                await _emailTransport.SendAsync(
                    item.Recipient,
                    item.Subject ?? item.TemplateCode,
                    text,
                    item.IsHtml ? item.Body : null,
                    attachments,
                    ct);
            }
            else if (item.Channel == NotificationChannels.Sms)
            {
                await PostSmsWebhookAsync(item, ct);
            }
            else
            {
                throw new InvalidOperationException($"Unsupported channel: {item.Channel}");
            }

            sw.Stop();
            item.Status = NotificationOutboxStatuses.Sent;
            item.ProcessedAtUtc = DateTime.UtcNow;
            item.ErrorMessage = null;
            await _db.SaveChangesAsync(ct);

            await _history.RecordAsync(
                item.MemberId,
                item.NotificationType,
                item.Channel,
                item.Recipient,
                item.Subject,
                item.Body,
                NotificationHistoryStatuses.Sent,
                item.RetryCount,
                item.CreatedByUserId,
                (int)sw.ElapsedMilliseconds,
                null,
                ct);
        }
        catch (Exception ex)
        {
            sw.Stop();
            item.RetryCount++;
            item.ErrorMessage = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;

            if (item.RetryCount >= item.MaxRetries)
            {
                item.Status = NotificationOutboxStatuses.Failed;
                item.ProcessedAtUtc = DateTime.UtcNow;
            }
            else
            {
                item.Status = NotificationOutboxStatuses.Pending;
                item.ScheduledForUtc = DateTime.UtcNow.AddMinutes(Math.Pow(2, item.RetryCount));
            }

            await _db.SaveChangesAsync(ct);

            await _history.RecordAsync(
                item.MemberId,
                item.NotificationType,
                item.Channel,
                item.Recipient,
                item.Subject,
                item.Body,
                NotificationHistoryStatuses.Failed,
                item.RetryCount,
                item.CreatedByUserId,
                (int)sw.ElapsedMilliseconds,
                item.ErrorMessage,
                ct);

            _logger.LogError(ex, "Notification outbox item {Id} failed (retry {Retry}).", item.Id, item.RetryCount);
        }
    }

    private async Task PostSmsWebhookAsync(NotificationOutbox item, CancellationToken ct)
    {
        await _smsTransport.SendAsync(
            item.Recipient,
            item.Body,
            item.MemberId,
            item.TemplateCode,
            ct);
    }

    private static IReadOnlyList<string>? ParseAttachments(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;
        return JsonSerializer.Deserialize<List<string>>(json);
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;
        return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ")
            .Replace("&nbsp;", " ", StringComparison.Ordinal)
            .Trim();
    }
}
