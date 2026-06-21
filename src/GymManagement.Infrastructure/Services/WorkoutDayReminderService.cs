using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services;

/// <summary>Daily in-app (+ optional push) reminder when a member has an active schedule for today.</summary>
public sealed class WorkoutDayReminderService : IWorkoutDayReminderService
{
    public const string NotificationType = "workout_today";

    private readonly ApplicationDbContext _db;
    private readonly IMemberPushNotificationService _push;
    private readonly ILogger<WorkoutDayReminderService> _logger;

    public WorkoutDayReminderService(
        ApplicationDbContext db,
        IMemberPushNotificationService push,
        ILogger<WorkoutDayReminderService> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    public async Task<int> CreateTodayRemindersAsync(CancellationToken cancellationToken = default)
    {
        var istNow = DateTime.UtcNow.AddHours(5.5);
        var today = istNow.Date;
        var todayDow = istNow.DayOfWeek;
        var markerPrefix = $"[wdr:{today:yyyyMMdd}:";

        var schedules = await _db.UserSchedules.AsNoTracking()
            .Where(s => s.IsActive
                && !s.IsDeleted
                && s.DayOfWeek == todayDow)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (schedules.Count == 0)
            return 0;

        var userIds = schedules.Select(s => s.UserId).Distinct().ToList();
        var existing = await _db.Notifications.AsNoTracking()
            .Where(n => userIds.Contains(n.UserId) && n.NotificationType == NotificationType)
            .Select(n => n.Message)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var existingMarkers = new HashSet<string>(
            existing
                .Where(m => m.Contains(markerPrefix, StringComparison.Ordinal))
                .Select(m =>
                {
                    var start = m.LastIndexOf(markerPrefix, StringComparison.Ordinal);
                    return start >= 0 ? m[start..].Trim() : string.Empty;
                })
                .Where(m => m.Length > 0),
            StringComparer.Ordinal);

        var planIds = schedules.Select(s => s.WorkoutPlanId).Distinct().ToList();
        var planNames = await _db.WorkoutPlans.AsNoTracking()
            .Where(p => planIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken)
            .ConfigureAwait(false);

        var created = 0;
        var utcNow = DateTime.UtcNow;

        foreach (var schedule in schedules)
        {
            var marker = $"{markerPrefix}{schedule.Id}]";
            if (existingMarkers.Contains(marker))
                continue;

            var planName = planNames.TryGetValue(schedule.WorkoutPlanId, out var name)
                ? name
                : "workout";
            var title = "Workout day";
            var pushBody = $"Today is {planName} day. Open Workouts to start your session.";
            var body = $"{pushBody} {marker}";

            await _db.Notifications.AddAsync(new Notification
            {
                UserId = schedule.UserId,
                Title = title,
                Message = body,
                NotificationType = NotificationType,
                IsRead = false,
                CreatedDate = utcNow,
            }, cancellationToken).ConfigureAwait(false);

            await _push.SendToUserAsync(
                    schedule.UserId,
                    title,
                    pushBody,
                    NotificationType,
                    cancellationToken)
                .ConfigureAwait(false);

            existingMarkers.Add(marker);
            created++;
        }

        if (created > 0)
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation("Workout day reminders: created {Count} notification(s).", created);
        return created;
    }
}
