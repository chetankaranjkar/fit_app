using GymManagement.Core.Options;
using GymManagement.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Hosting;

/// <summary>Daily workout-day in-app notifications (and optional FCM push).</summary>
public sealed class WorkoutDayReminderHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WorkoutDayReminderHostedService> _logger;

    public WorkoutDayReminderHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<WorkoutDayReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken).ConfigureAwait(false);

        while (!stoppingToken.IsCancellationRequested)
        {
            NotificationWebhookOptions opts;
            using (var scope = _scopeFactory.CreateScope())
            {
                opts = scope.ServiceProvider.GetRequiredService<IOptions<NotificationWebhookOptions>>().Value;
            }

            if (opts.EnableWorkoutDayReminders)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IWorkoutDayReminderService>();
                    await service.CreateTodayRemindersAsync(stoppingToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Workout day reminder scan failed.");
                }
            }

            var hours = Math.Max(1, opts.ReminderIntervalHours);
            await Task.Delay(TimeSpan.FromHours(hours), stoppingToken).ConfigureAwait(false);
        }
    }
}
