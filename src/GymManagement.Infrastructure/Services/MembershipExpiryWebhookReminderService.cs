using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services;

public sealed class MembershipExpiryWebhookReminderService : IMembershipExpiryWebhookReminderService
{
    private static readonly MembershipStatus[] ReminderStatuses =
    {
        MembershipStatus.Active,
        MembershipStatus.ActivePendingPayment,
        MembershipStatus.PartialPayment,
    };

    private readonly ApplicationDbContext _db;
    private readonly INotificationWebhookDispatcher _dispatcher;
    private readonly ILogger<MembershipExpiryWebhookReminderService> _logger;

    public MembershipExpiryWebhookReminderService(
        ApplicationDbContext db,
        INotificationWebhookDispatcher dispatcher,
        ILogger<MembershipExpiryWebhookReminderService> logger)
    {
        _db = db;
        _dispatcher = dispatcher;
        _logger = logger;
    }

    public async Task<int> DispatchMilestoneRemindersAsync(int withinDays, CancellationToken cancellationToken = default)
    {
        var windowDays = Math.Clamp(withinDays, 1, 90);
        var today = DateTime.UtcNow.Date;
        var windowEnd = today.AddDays(windowDays);

        var memberships = await _db.UserMemberships
            .AsNoTracking()
            .Include(m => m.User!)
                .ThenInclude(u => u.AuthUser)
            .Include(m => m.Plan)
            .Where(m => !m.IsDeleted
                && ReminderStatuses.Contains(m.Status)
                && m.EndDate.Date >= today
                && m.EndDate.Date <= windowEnd)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var dispatched = 0;
        foreach (var m in memberships)
        {
            var days = (m.EndDate.Date - today).Days;
            if (!MembershipExpiryNotificationMessages.MilestoneDays.Contains(days))
                continue;

            var user = m.User;
            var email = user?.AuthUser?.Email;
            var name = user != null ? $"{user.FirstName} {user.LastName}".Trim() : string.Empty;

            var dto = new MembershipExpiringNotificationDto
            {
                UserId = m.UserId,
                MembershipId = m.Id,
                MemberName = string.IsNullOrEmpty(name) ? null : name,
                MemberEmail = email,
                MemberPhone = user?.Phone,
                PlanName = m.Plan?.PlanName,
                EndDateUtc = m.EndDate,
                DaysRemaining = days,
            };

            await _dispatcher.DispatchMembershipExpiringAsync(dto, cancellationToken).ConfigureAwait(false);
            dispatched++;
        }

        _logger.LogInformation(
            "Membership expiry webhook milestones: {Dispatched} dispatch(es) from {Scanned} membership(s) in {Days}-day window.",
            dispatched,
            memberships.Count,
            windowDays);

        return dispatched;
    }
}
