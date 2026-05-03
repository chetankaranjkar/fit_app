using GymManagement.Core.Options;
using GymManagement.Core.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services;

public sealed class DoorUnlockService : IDoorUnlockService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<DoorDeviceOptions> _opts;
    private readonly ILogger<DoorUnlockService> _logger;

    public DoorUnlockService(
        IHttpClientFactory httpClientFactory,
        IOptions<DoorDeviceOptions> opts,
        ILogger<DoorUnlockService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _opts = opts;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<bool> TryUnlockAsync(
        string? requestOverrideUrl,
        string? branchDoorBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var o = _opts.Value;
        if (!o.Enabled)
        {
            _logger.LogDebug("Door unlock skipped (DoorDevice:Enabled=false).");
            return true;
        }

        string? resolved = null;
        if (!string.IsNullOrWhiteSpace(requestOverrideUrl))
        {
            if (!o.AllowOverrideBaseUrl)
            {
                _logger.LogWarning("Door device URL override rejected (DoorDevice:AllowOverrideBaseUrl=false).");
            }
            else
            {
                resolved = requestOverrideUrl.Trim().TrimEnd('/');
            }
        }

        if (string.IsNullOrEmpty(resolved) && !string.IsNullOrWhiteSpace(branchDoorBaseUrl))
            resolved = branchDoorBaseUrl.Trim().TrimEnd('/');

        if (string.IsNullOrEmpty(resolved))
            resolved = string.IsNullOrWhiteSpace(o.Esp32BaseUrl) ? null : o.Esp32BaseUrl.Trim().TrimEnd('/');

        if (string.IsNullOrEmpty(resolved))
        {
            _logger.LogWarning("Door unlock skipped — no branch-specific URL or DoorDevice:Esp32BaseUrl.");
            return false;
        }

        try
        {
            var http = _httpClientFactory.CreateClient("door-device");
            var url = $"{resolved}/unlock";
            using var response = await http.PostAsync(url, content: null, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Door unlock HTTP {Status} at {Url}.", response.StatusCode, url);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Door unlock POST failed.");
            return false;
        }
    }
}
