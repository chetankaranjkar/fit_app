using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IMembershipApprovalRequestService
    {
        Task<MembershipApprovalRequestDto> CreateAsync(
            CreateMembershipApprovalRequestDto dto,
            int requestedByUserId,
            CancellationToken ct = default);

        Task<IReadOnlyList<MembershipApprovalRequestDto>> ListAsync(
            MembershipApprovalRequestStatusFilter? status,
            string? search,
            CancellationToken ct = default);

        Task<MembershipApprovalRequestDto?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<MembershipApprovalRequestDto> ApproveAsync(
            int id,
            int approvedByUserId,
            ApproveMembershipApprovalRequestDto dto,
            CancellationToken ct = default);

        Task<MembershipApprovalRequestDto> RejectAsync(
            int id,
            int rejectedByUserId,
            RejectMembershipApprovalRequestDto dto,
            CancellationToken ct = default);
    }
}
