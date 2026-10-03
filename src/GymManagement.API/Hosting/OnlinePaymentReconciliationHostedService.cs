using GymManagement.Core.Options;
using GymManagement.Core.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace GymManagement.API.Hosting
{
    /// <summary>
    /// Applies Razorpay captures whose client verify and webhook never arrived (closed tab, lost connectivity),
    /// and expires unpaid attempts. No-op unless online payments are enabled.
    /// </summary>
    public sealed class OnlinePaymentReconciliationHostedService : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IOptions<CommercialOptions> _options;
        private readonly ILogger<OnlinePaymentReconciliationHostedService> _logger;

        public OnlinePaymentReconciliationHostedService(
            IServiceScopeFactory scopeFactory,
            IOptions<CommercialOptions> options,
            ILogger<OnlinePaymentReconciliationHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _options = options;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Value.EnableOnlinePayments || !_options.Value.IsRazorpayConfigured)
                return;

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var payments = scope.ServiceProvider.GetRequiredService<IOnlinePaymentService>();
                    var changed = await payments.ReconcileOpenOrdersAsync(stoppingToken);
                    if (changed > 0)
                        _logger.LogInformation("Online payment reconciliation updated {Count} attempt(s).", changed);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Online payment reconciliation job failed.");
                }

                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}
