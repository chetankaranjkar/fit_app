namespace GymManagement.Core.Services;

/// <summary>Per-user opt-in for outbound email and SMS/WhatsApp notifications.</summary>
public interface IUserNotificationPreferenceService
{
    Task<bool> CanReceiveEmailAsync(int userId, CancellationToken ct = default);
    Task<bool> CanReceiveSmsAsync(int userId, CancellationToken ct = default);
}
