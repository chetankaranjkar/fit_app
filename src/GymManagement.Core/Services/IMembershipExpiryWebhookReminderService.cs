namespace GymManagement.Core.Services;

/// <summary>POSTs <c>membership_expiring</c> webhook events at expiry milestones (14, 7, 3, 1, 0 days).</summary>
public interface IMembershipExpiryWebhookReminderService
{
    /// <returns>Number of membership rows that triggered a webhook dispatch attempt.</returns>
    Task<int> DispatchMilestoneRemindersAsync(int withinDays, CancellationToken cancellationToken = default);
}
