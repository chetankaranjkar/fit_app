using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IOutboundEmailService
{
    Task SendPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken ct = default);
    Task<SendNotificationChannelResultDto> TrySendPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken ct = default);
    Task<SendNotificationChannelResultDto> TrySendPaymentDueReminderAsync(PaymentDueReminderNotificationDto dto, CancellationToken ct = default);
    Task SendMembershipExpiringAsync(MembershipExpiringNotificationDto dto, CancellationToken ct = default);
    Task SendDietAssignmentAssignedAsync(DietAssignmentAssignedNotificationDto dto, CancellationToken ct = default);
    Task SendTestEmailAsync(string toAddress, CancellationToken ct = default);
}
