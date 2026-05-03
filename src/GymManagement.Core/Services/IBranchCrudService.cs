using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

/// <summary>ADMIN/STAFF branch directory CRUD (+ soft deactivate) and QR-console option list.</summary>
public interface IBranchCrudService
{
    Task<IReadOnlyList<BranchCrudDto>> ListAsync(bool activeOnly = false, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BranchOptionDto>> GetActiveBranchQrOptionsAsync(CancellationToken cancellationToken = default);

    Task<BranchCrudDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<BranchCrudDto> CreateAsync(BranchCreateDto dto, CancellationToken cancellationToken = default);

    Task<BranchCrudDto> UpdateAsync(int id, BranchUpdateDto dto, CancellationToken cancellationToken = default);

    Task SoftDeactivateAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrganizationOptionDto>> OrganizationOptionsAsync(CancellationToken cancellationToken = default);
}
