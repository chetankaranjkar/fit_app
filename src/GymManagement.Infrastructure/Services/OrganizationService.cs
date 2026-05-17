using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class OrganizationService : IOrganizationService
{
    private readonly ApplicationDbContext _db;

    public OrganizationService(ApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<OrganizationListDto>> ListAsync(CancellationToken cancellationToken = default) =>
        await _db.Organizations.AsNoTracking()
            .Where(o => o.IsActive)
            .OrderBy(o => o.Name)
            .Select(o => new OrganizationListDto
            {
                Id = o.Id,
                Name = o.Name,
                OrganizationType = o.OrganizationType,
                IsActive = o.IsActive,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    public async Task<OrganizationListDto> CreateAsync(OrganizationCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Organization name is required.");

        var org = new Organization
        {
            Name = name,
            OrganizationType = string.IsNullOrWhiteSpace(dto.OrganizationType) ? "Gym" : dto.OrganizationType.Trim(),
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
        };

        _db.Organizations.Add(org);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new OrganizationListDto
        {
            Id = org.Id,
            Name = org.Name,
            OrganizationType = org.OrganizationType,
            IsActive = org.IsActive,
        };
    }
}
