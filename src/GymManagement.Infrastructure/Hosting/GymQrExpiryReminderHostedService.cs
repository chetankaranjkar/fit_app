using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Hosting;

/// <summary>Runs <see cref="IQrExpiryReminderService"/> periodically (notifications in the final ~3-day window before expiry).</summary>
public sealed class GymQrExpiryReminderHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GymQrExpiryReminderHostedService> _logger;

    public GymQrExpiryReminderHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<GymQrExpiryReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken).ConfigureAwait(false);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                if (!await db.Database.CanConnectAsync(stoppingToken).ConfigureAwait(false))
                {
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken).ConfigureAwait(false);
                    continue;
                }

                var reminder = scope.ServiceProvider.GetRequiredService<IQrExpiryReminderService>();
                await reminder.RunOnceAsync(DateTime.UtcNow, stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "QR expiry reminder job failed.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken).ConfigureAwait(false);
        }
    }
}
