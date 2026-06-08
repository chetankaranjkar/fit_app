using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services;

/// <summary>
/// Writes member-facing in-app notifications at expiry milestones (14, 7, 3, 1, 0 days).
/// Dedupes via markers embedded in <see cref="Notification.Message"/>.
/// </summary>
public sealed class MembershipExpiryInAppNotificationService : IMembershipExpiryInAppNotificationService
{

    private static readonly MembershipStatus[] ReminderStatuses =
    {
        MembershipStatus.Active,
        MembershipStatus.ActivePendingPayment,
        MembershipStatus.PartialPayment,
    };

    private readonly ApplicationDbContext _db;
    private readonly ILogger<MembershipExpiryInAppNotificationService> _logger;

    public MembershipExpiryInAppNotificationService(
        ApplicationDbContext db,
        ILogger<MembershipExpiryInAppNotificationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<int> CreateRemindersAsync(int withinDays, CancellationToken cancellationToken = default)
    {
        var windowDays = Math.Clamp(withinDays, 1, 90);
        var today = DateTime.UtcNow.Date;
        var windowEnd = today.AddDays(windowDays);

        var memberships = await _db.UserMemberships
            .AsNoTracking()
            .Include(m => m.Plan)
            .Where(m => !m.IsDeleted
                && ReminderStatuses.Contains(m.Status)
                && m.EndDate.Date >= today
                && m.EndDate.Date <= windowEnd)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (memberships.Count == 0)
            return 0;

        var userIds = memberships.Select(m => m.UserId).Distinct().ToList();
        var existingMarkers = await _db.Notifications
            .AsNoTracking()
            .Where(n => userIds.Contains(n.UserId)
                && n.NotificationType == MembershipExpiryNotificationMessages.NotificationType)
            .Select(n => n.Message)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var existingSet = new HashSet<string>(
            existingMarkers
                .Select(MembershipExpiryNotificationMessages.ExtractMarker)
                .Where(m => m != null)
                .Select(m => m!),
            StringComparer.Ordinal);

        var created = 0;
        var utcNow = DateTime.UtcNow;

        foreach (var m in memberships)
        {
            var days = (m.EndDate.Date - today).Days;
            if (!MembershipExpiryNotificationMessages.MilestoneDays.Contains(days))
                continue;

            var marker = MembershipExpiryNotificationMessages.BuildMarker(m.Id, days);
            if (existingSet.Contains(marker))
                continue;

            var planName = string.IsNullOrWhiteSpace(m.Plan?.PlanName) ? "membership" : m.Plan!.PlanName.Trim();
            var endLabel = m.EndDate.Date.ToString("dd MMM yyyy");
            var (title, body) = MembershipExpiryNotificationMessages.BuildCopy(planName, endLabel, days);

            await _db.Notifications.AddAsync(new Notification
            {
                UserId = m.UserId,
                Title = title,
                Message = $"{body} {marker}",
                IsRead = false,
                NotificationType = MembershipExpiryNotificationMessages.NotificationType,
                CreatedDate = utcNow,
            }, cancellationToken).ConfigureAwait(false);

            existingSet.Add(marker);
            created++;
        }

        if (created > 0)
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Membership in-app expiry reminders: {Created} notification(s) from {Scanned} membership(s) in window.",
            created,
            memberships.Count);

        return created;
    }
}
