using GymManagement.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Hosting;

/// <summary>Processes queued email/SMS notifications with retry.</summary>
public sealed class NotificationOutboxHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationOutboxHostedService> _logger;

    public NotificationOutboxHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<NotificationOutboxHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var templates = scope.ServiceProvider.GetRequiredService<INotificationTemplateService>();
                await templates.EnsureSeededAsync(stoppingToken);

                var outbox = scope.ServiceProvider.GetRequiredService<INotificationOutboxService>();
                await outbox.ProcessPendingAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Notification outbox processor error.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
