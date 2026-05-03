using GymManagement.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Hosting;

/// <summary>Every 5 minutes, completes gym QR workout sessions idle longer than 60 minutes.</summary>
public sealed class GymQrSessionExpiryHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GymQrSessionExpiryHostedService> _logger;

    public GymQrSessionExpiryHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<GymQrSessionExpiryHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken).ConfigureAwait(false);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var workout = scope.ServiceProvider.GetRequiredService<IGymQrFloorWorkoutService>();
                var n = await workout.ExpireInactiveSessionsAsync(stoppingToken).ConfigureAwait(false);
                if (n > 0)
                    _logger.LogInformation("Auto-completed {Count} inactive gym QR workout session(s).", n);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gym QR session expiry pass failed.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken).ConfigureAwait(false);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }
}
