using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    /// <summary>POSTs structured events to optional email/WhatsApp webhook URLs with retries and logging.</summary>
    public interface INotificationWebhookDispatcher
    {
        Task DispatchPaymentReceiptAsync(PaymentReceiptNotificationDto dto, CancellationToken cancellationToken = default);

        Task DispatchMembershipExpiringAsync(MembershipExpiringNotificationDto dto, CancellationToken cancellationToken = default);

        Task DispatchDietAssignmentAssignedAsync(DietAssignmentAssignedNotificationDto dto, CancellationToken cancellationToken = default);
    }
}
