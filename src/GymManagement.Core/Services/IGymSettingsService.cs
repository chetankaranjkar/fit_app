using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IGymSettingsService
{
    Task<GymSettingsDto> GetAsync(CancellationToken ct = default);
    Task EnsureMemberCanCreatePersonalPlanAsync(int memberUserId, CancellationToken ct = default);
}
