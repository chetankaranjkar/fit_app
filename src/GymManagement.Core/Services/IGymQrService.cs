using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IGymQrService
{
    Task<QrGenerateResponseDto> GenerateAsync(int branchId, CancellationToken cancellationToken = default);
    Task<QrScanResponseDto> ScanAsync(QrScanRequestDto request, int memberUserId, CancellationToken cancellationToken = default);
    Task<QrOwnerDashboardDto> GetOwnerDashboardAsync(int branchId, CancellationToken cancellationToken = default);
}
