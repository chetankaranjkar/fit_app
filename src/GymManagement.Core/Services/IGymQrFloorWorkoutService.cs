using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IGymQrFloorWorkoutService
{
    Task<(Guid sessionId, DateTime startUtc)> EnsureSessionAfterScanAsync(
        int memberUserId,
        int branchId,
        CancellationToken cancellationToken = default);

    Task<GymQrWorkoutLogResponseDto> AddLogAsync(
        int memberUserId,
        GymQrWorkoutLogRequestDto dto,
        CancellationToken cancellationToken = default);

    Task<bool> EndSessionAsync(int memberUserId, Guid sessionId, CancellationToken cancellationToken = default);

    /// <summary>Background: complete sessions idle &gt; 60 minutes.</summary>
    Task<int> ExpireInactiveSessionsAsync(CancellationToken cancellationToken = default);
}
