namespace GymManagement.Core.Services;

/// <summary>Sends Firebase push notifications to a member's registered devices.</summary>
public interface IMemberPushNotificationService
{
    Task SendToUserAsync(
        int userId,
        string title,
        string body,
        string? notificationType = null,
        CancellationToken cancellationToken = default);
}
