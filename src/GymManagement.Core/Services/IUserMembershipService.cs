using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    public interface IUserMembershipService
    {
        Task<IEnumerable<UserMembershipDto>> GetAllAsync();
        Task<UserMembershipSummaryDto> GetSummaryAsync();
        Task<PagedResultDto<UserMembershipDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            MembershipStatus? status = null,
            bool needsPayment = false,
            int? expiringWithinDays = null,
            bool includeTerminal = false,
            int? membershipId = null);
        Task<PagedResultDto<ExpiringMembershipQueueItemDto>> GetExpiringQueueAsync(
            int withinDays,
            int page,
            int pageSize,
            string? search = null);
        Task<IEnumerable<UserMembershipDto>> GetByUserIdAsync(int userId);
        Task<UserMembershipDto?> GetByIdAsync(int id);
        Task<ActiveMembershipConflictDto?> GetActiveMembershipConflictForUserAsync(int userId, int? excludeMembershipId = null);
        Task<UserMembershipDto> CreateAsync(CreateUserMembershipDto dto, int performedByUserId);
        Task<UserMembershipDto?> UpdateAsync(int id, UpdateUserMembershipDto dto, int performedByUserId);
        Task<UserMembershipDto> RenewAccessAsync(int id, RenewMembershipAccessDto? dto, int performedByUserId);
        Task<LastRenewalRevertPreviewDto?> GetLastRenewalRevertPreviewAsync(int membershipId);
        Task<UserMembershipDto> RevertLastRenewalAsync(int id, int performedByUserId);
    }
}
