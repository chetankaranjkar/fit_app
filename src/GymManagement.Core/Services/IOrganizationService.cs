using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IOrganizationService
{
    Task<IReadOnlyList<OrganizationListDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<OrganizationListDto> CreateAsync(OrganizationCreateDto dto, CancellationToken cancellationToken = default);
}
