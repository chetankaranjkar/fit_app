using GymManagement.Core.DTOs;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Hosting
{
    /// <summary>
    /// Optional periodic scan for memberships nearing expiry; POSTs <see cref="NotificationWebhookEventTypes.MembershipExpiring"/> to configured webhooks.
    /// </summary>
    public sealed class MembershipExpiryReminderHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MembershipExpiryReminderHostedService> _logger;

        public MembershipExpiryReminderHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<MembershipExpiryReminderHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken).ConfigureAwait(false);

            while (!stoppingToken.IsCancellationRequested)
            {
                NotificationWebhookOptions opts;
                using (var scope = _scopeFactory.CreateScope())
                {
                    opts = scope.ServiceProvider.GetRequiredService<IOptions<NotificationWebhookOptions>>().Value;
                }

                if (!opts.EnableScheduledReminders)
                {
                    await Task.Delay(TimeSpan.FromHours(6), stoppingToken).ConfigureAwait(false);
                    continue;
                }

                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var dispatcher = scope.ServiceProvider.GetRequiredService<INotificationWebhookDispatcher>();

                    var now = DateTime.UtcNow.Date;
                    var windowEnd = now.AddDays(opts.MembershipExpiryReminderDays);

                    var memberships = await db.UserMemberships
                        .AsNoTracking()
                        .Include(m => m.User!)
                            .ThenInclude(u => u.AuthUser)
                        .Include(m => m.Plan)
                        .Where(m =>
                            m.Status == MembershipStatus.Active &&
                            m.EndDate.Date >= now &&
                            m.EndDate.Date <= windowEnd)
                        .ToListAsync(stoppingToken)
                        .ConfigureAwait(false);

                    foreach (var m in memberships)
                    {
                        var user = m.User;
                        var email = user?.AuthUser?.Email;
                        var name = user != null ? $"{user.FirstName} {user.LastName}".Trim() : string.Empty;
                        var days = (m.EndDate.Date - now).Days;

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

                        await dispatcher.DispatchMembershipExpiringAsync(dto, stoppingToken).ConfigureAwait(false);
                    }

                    _logger.LogInformation(
                        "Membership expiry reminder scan finished; {Count} active membership(s) in window.",
                        memberships.Count);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Membership expiry reminder scan failed.");
                }

                var hours = Math.Max(1, opts.ReminderIntervalHours);
                await Task.Delay(TimeSpan.FromHours(hours), stoppingToken).ConfigureAwait(false);
            }
        }
    }
}
