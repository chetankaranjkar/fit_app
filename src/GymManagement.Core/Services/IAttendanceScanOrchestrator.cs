using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IAttendanceScanOrchestrator
{
    Task<AttendanceScanResponseDto> ScanAsync(AttendanceScanRequestDto request, int memberUserId, CancellationToken cancellationToken = default);
}
