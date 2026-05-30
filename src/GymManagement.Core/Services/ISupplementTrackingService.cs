using GymManagement.Core.DTOs.Supplements;

namespace GymManagement.Core.Services;

public interface ISupplementTrackingService
{
    Task<bool> CanAccessMemberSupplementsAsync(
        int requestingUserId,
        int targetUserId,
        bool hasUsersAccess,
        bool hasTrainerAccess,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupplementMasterDto>> ListMasterAsync(bool activeOnly, CancellationToken cancellationToken = default);
    Task<SupplementMasterDto?> GetMasterByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<SupplementMasterDto> CreateMasterAsync(UpsertSupplementMasterDto dto, CancellationToken cancellationToken = default);
    Task<SupplementMasterDto> UpdateMasterAsync(int id, UpsertSupplementMasterDto dto, CancellationToken cancellationToken = default);
    Task DeleteMasterAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MemberSupplementDto>> GetByUserIdAsync(int userId, bool activeOnly, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MemberSupplementDto>> GetHistoryByUserIdAsync(int userId, CancellationToken cancellationToken = default);
    Task<MemberSupplementDto> AssignAsync(CreateMemberSupplementDto dto, int assignedByUserId, CancellationToken cancellationToken = default);
    Task<int?> GetAssignmentUserIdAsync(int assignmentId, CancellationToken cancellationToken = default);
    Task<MemberSupplementDto> UpdateAssignmentAsync(int id, UpdateMemberSupplementDto dto, CancellationToken cancellationToken = default);
    Task<SupplementAnalyticsDto> GetAnalyticsAsync(CancellationToken cancellationToken = default);
}
