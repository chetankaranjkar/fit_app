using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationHistoryService : INotificationHistoryService
{
    private readonly ApplicationDbContext _db;

    public NotificationHistoryService(ApplicationDbContext db) => _db = db;

    public async Task RecordAsync(
        int? memberId,
        string notificationType,
        string channel,
        string recipient,
        string? subject,
        string message,
        string status,
        int retryCount,
        int? createdByUserId,
        int? durationMs,
        string? errorMessage,
        CancellationToken ct = default)
    {
        var row = new NotificationHistory
        {
            MemberId = memberId,
            NotificationType = notificationType,
            Channel = channel,
            Recipient = recipient,
            Subject = subject,
            Message = message.Length > 8000 ? message[..8000] : message,
            Status = status,
            SentDate = status == NotificationHistoryStatuses.Sent ? DateTime.UtcNow : null,
            ErrorMessage = errorMessage,
            RetryCount = retryCount,
            CreatedByUserId = createdByUserId,
            DurationMs = durationMs,
        };
        await _db.NotificationHistories.AddAsync(row, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<NotificationHistoryDto>> ListAsync(int? memberId, int take, CancellationToken ct = default)
    {
        var q = _db.NotificationHistories.AsNoTracking().Where(h => !h.IsDeleted);
        if (memberId.HasValue)
            q = q.Where(h => h.MemberId == memberId);

        var rows = await q.OrderByDescending(h => h.CreatedDate).Take(Math.Clamp(take, 1, 200)).ToListAsync(ct);
        return rows.Select(h => new NotificationHistoryDto
        {
            Id = h.Id,
            MemberId = h.MemberId,
            NotificationType = h.NotificationType,
            Channel = h.Channel,
            Recipient = h.Recipient,
            Subject = h.Subject,
            Message = h.Message,
            Status = h.Status,
            SentDate = h.SentDate,
            ErrorMessage = h.ErrorMessage,
            RetryCount = h.RetryCount,
            CreatedDate = h.CreatedDate,
        }).ToList();
    }
}
