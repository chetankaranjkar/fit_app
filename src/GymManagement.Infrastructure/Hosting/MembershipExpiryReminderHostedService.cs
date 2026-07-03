using GymManagement.Core.Options;
using GymManagement.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Hosting
{
    /// <summary>
    /// Periodic membership expiry job: in-app <see cref="Notification"/> rows for members and optional outbound webhooks.
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

                try
                {
                    using var scope = _scopeFactory.CreateScope();

                    if (opts.EnableInAppMembershipExpiryReminders)
                    {
                        var inApp = scope.ServiceProvider
                            .GetRequiredService<IMembershipExpiryInAppNotificationService>();
                        await inApp.CreateRemindersAsync(opts.InAppMembershipExpiryReminderDays, stoppingToken)
                            .ConfigureAwait(false);
                    }

                    var emailSettings = scope.ServiceProvider.GetRequiredService<IEmailSettingsService>();
                    var smtp = await emailSettings.GetSmtpConfigAsync(stoppingToken).ConfigureAwait(false);
                    var smsTransport = scope.ServiceProvider.GetRequiredService<ISmsTransportService>();
                    var smsScheduled = await smsTransport.AllowsExpiryRemindersAsync(stoppingToken).ConfigureAwait(false);
                    var webhookScheduled = opts.EnableScheduledReminders && !string.IsNullOrWhiteSpace(opts.EmailWebhookUrl);
                    var smtpScheduled = smtp.IsConfigured && smtp.SendMembershipExpiryReminders;

                    if (webhookScheduled || smsScheduled || smtpScheduled)
                    {
                        var webhooks = scope.ServiceProvider
                            .GetRequiredService<IMembershipExpiryWebhookReminderService>();
                        await webhooks.DispatchMilestoneRemindersAsync(opts.MembershipExpiryReminderDays, stoppingToken)
                            .ConfigureAwait(false);
                    }
                    else if (opts.EnableScheduledReminders && !webhookScheduled && !smsScheduled && !smtpScheduled)
                    {
                        _logger.LogWarning(
                            "EnableScheduledReminders is true but no Email webhook, SMS settings, or SMTP expiry reminders are configured; outbound reminders skipped.");
                    }
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
