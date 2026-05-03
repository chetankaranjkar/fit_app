using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

/// <summary>Branch listing + geo / per-door URL updates for QR entry (ADMIN + STAFF).</summary>
public interface IBranchQrAccessService
{
    Task<IReadOnlyList<BranchOptionDto>> ListForQrConsoleAsync(CancellationToken cancellationToken = default);

    Task UpdateQrAccessAsync(int branchId, BranchQrAccessPutDto dto, CancellationToken cancellationToken = default);

    Task<string?> GetEsp32DoorBaseUrlAsync(int branchId, CancellationToken cancellationToken = default);
}
