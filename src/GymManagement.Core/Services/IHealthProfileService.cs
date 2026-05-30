using GymManagement.Core.DTOs.Health;

namespace GymManagement.Core.Services
{
    public interface IHealthProfileService
    {
        Task<HealthProfileDto?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);
        Task<HealthProfileSummaryDto?> GetSummaryByUserIdAsync(int userId, CancellationToken cancellationToken = default);
        Task<HealthProfileDto> UpsertAsync(int userId, UpsertHealthProfileDto dto, CancellationToken cancellationToken = default);
        Task<bool> CanAccessUserHealthProfileAsync(int requestingUserId, int targetUserId, bool hasUsersAccess, bool hasTrainerAccess, CancellationToken cancellationToken = default);
    }
}
