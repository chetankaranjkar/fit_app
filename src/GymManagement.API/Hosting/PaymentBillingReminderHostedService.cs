using GymManagement.Core.Services;
using Microsoft.Extensions.Hosting;

namespace GymManagement.API.Hosting
{
    /// <summary>Daily overdue refresh + in-app due notifications for membership billing.</summary>
    public sealed class PaymentBillingReminderHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PaymentBillingReminderHostedService> _logger;

        public PaymentBillingReminderHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<PaymentBillingReminderHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var billing = scope.ServiceProvider.GetRequiredService<IMembershipPaymentService>();
                    var overdue = await billing.RefreshOverdueStatusesAsync(stoppingToken);
                    var notes = await billing.CreateDueDateNotificationsAsync(stoppingToken);
                    if (overdue > 0 || notes > 0)
                        _logger.LogInformation("Billing reminders: {Overdue} overdue updates, {Notifications} notifications.", overdue, notes);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Payment billing reminder job failed.");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}
