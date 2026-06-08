namespace GymManagement.Core.Services;

/// <summary>Creates in-app notification rows for members nearing membership end.</summary>
public interface IMembershipExpiryInAppNotificationService
{
    /// <returns>Number of new notification rows persisted.</returns>
    Task<int> CreateRemindersAsync(int withinDays, CancellationToken cancellationToken = default);
}
