using FirebaseAdmin.Messaging;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Configuration;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services;

public sealed class MemberPushNotificationService : IMemberPushNotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly FirebaseOptions _firebase;
    private readonly NotificationWebhookOptions _notificationOptions;
    private readonly ILogger<MemberPushNotificationService> _logger;

    public MemberPushNotificationService(
        ApplicationDbContext db,
        IOptions<FirebaseOptions> firebase,
        IOptions<NotificationWebhookOptions> notificationOptions,
        ILogger<MemberPushNotificationService> logger)
    {
        _db = db;
        _firebase = firebase.Value;
        _notificationOptions = notificationOptions.Value;
        _logger = logger;
    }

    public async Task SendToUserAsync(
        int userId,
        string title,
        string body,
        string? notificationType = null,
        CancellationToken cancellationToken = default)
    {
        if (!_notificationOptions.EnablePushNotifications
            || !_firebase.Enabled
            || !_firebase.HasAdminCredentials)
        {
            return;
        }

        var tokens = await _db.UserDevices.AsNoTracking()
            .Where(d => d.UserId == userId
                && d.IsActive
                && !d.IsDeleted
                && d.FcmToken != null
                && d.FcmToken != "")
            .Select(d => d.FcmToken!)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (tokens.Count == 0)
            return;

        foreach (var token in tokens)
        {
            try
            {
                var message = new Message
                {
                    Token = token,
                    Notification = new Notification
                    {
                        Title = title,
                        Body = TrimForPush(body),
                    },
                    Data = new Dictionary<string, string>
                    {
                        ["type"] = notificationType ?? string.Empty,
                    },
                };
                await FirebaseMessaging.DefaultInstance
                    .SendAsync(message, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (FirebaseMessagingException ex) when (
                ex.MessagingErrorCode is MessagingErrorCode.Unregistered
                    or MessagingErrorCode.InvalidArgument)
            {
                _logger.LogInformation("Removing invalid FCM token for user {UserId}.", userId);
                await ClearTokenAsync(userId, token, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "FCM send failed for user {UserId}.", userId);
            }
        }
    }

    private async Task ClearTokenAsync(int userId, string token, CancellationToken cancellationToken)
    {
        var devices = await _db.UserDevices
            .Where(d => d.UserId == userId && d.FcmToken == token && !d.IsDeleted)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var device in devices)
        {
            device.FcmToken = null;
            device.FcmTokenUpdatedAt = null;
            device.UpdatedDate = DateTime.UtcNow;
        }

        if (devices.Count > 0)
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static string TrimForPush(string body)
    {
        var trimmed = body.Trim();
        const int max = 240;
        return trimmed.Length <= max ? trimmed : trimmed[..max] + "…";
    }
}
