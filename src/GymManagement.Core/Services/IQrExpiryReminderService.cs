namespace GymManagement.Core.Services;

/// <summary>Creates Notifications rows when venue QR expiry is within three days.</summary>
public interface IQrExpiryReminderService
{
    Task RunOnceAsync(DateTime utcNow, CancellationToken cancellationToken = default);
}
