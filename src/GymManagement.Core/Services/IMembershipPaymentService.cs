using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    public interface IMembershipPaymentService
    {
        Task EnsureBillingForNewMembershipAsync(
            User user,
            UserMembership membership,
            MembershipPlan plan,
            CancellationToken cancellationToken = default);

        /// <summary>Creates billing for an existing membership when missing (backfill / User Memberships API).</summary>
        Task EnsureBillingForMembershipIdAsync(int membershipId, CancellationToken cancellationToken = default);

        Task<MembershipPaymentDto?> GetByMembershipIdAsync(int membershipId, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<MembershipPaymentDto>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);

        Task<MembershipPaymentDto> RecordInstallmentAsync(
            int membershipPaymentId,
            RecordMembershipPaymentInstallmentDto dto,
            int? staffUserId,
            CancellationToken cancellationToken = default);

        Task<MembershipPaymentDashboardDto> GetDashboardSummaryAsync(CancellationToken cancellationToken = default);

        Task<int> RefreshOverdueStatusesAsync(CancellationToken cancellationToken = default);

        Task<int> CreateDueDateNotificationsAsync(CancellationToken cancellationToken = default);

        Task MarkReminderSentAsync(int membershipPaymentId, CancellationToken cancellationToken = default);

        Task<bool> IsMemberAccessBlockedAsync(int userId, CancellationToken cancellationToken = default);

        Task<MemberBillingAccessDto> GetMemberBillingAccessAsync(int userId, CancellationToken cancellationToken = default);

        Task<byte[]?> GetInvoicePdfForMembershipPaymentAsync(int membershipPaymentId, CancellationToken cancellationToken = default);

        Task<MembershipPaymentDto> ApplyCouponAsync(
            int membershipPaymentId,
            ApplyCouponToPaymentDto dto,
            CancellationToken cancellationToken = default);

        Task<MembershipPaymentDto> RemoveCouponAsync(
            int membershipPaymentId,
            CancellationToken cancellationToken = default);
    }
}
