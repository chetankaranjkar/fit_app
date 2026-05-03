using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace GymManagement.Infrastructure.Services;

public sealed class BranchCrudService : IBranchCrudService
{
    private readonly ApplicationDbContext _db;

    public BranchCrudService(ApplicationDbContext db) => _db = db;

    private static readonly Expression<Func<Branch, BranchCrudDto>> ProjectRow = b => new BranchCrudDto
    {
        Id = b.Id,
        OrganizationId = b.OrganizationId,
        OrganizationName = b.Organization != null ? b.Organization.Name : null,
        BranchName = b.BranchName,
        Address = b.Address,
        ContactNumber = b.ContactNumber,
        Latitude = b.Latitude,
        Longitude = b.Longitude,
        Esp32DoorBaseUrl = b.Esp32DoorBaseUrl,
        IsActive = b.IsActive,
    };

    public async Task<IReadOnlyList<BranchCrudDto>> ListAsync(
        bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        var q = _db.Branches.AsNoTracking().AsQueryable();
        if (activeOnly)
            q = q.Where(b => b.IsActive);

        var list = await q.OrderBy(b => b.BranchName).Select(ProjectRow).ToListAsync(cancellationToken).ConfigureAwait(false);
        return list;
    }

    public async Task<IReadOnlyList<BranchOptionDto>> GetActiveBranchQrOptionsAsync(
        CancellationToken cancellationToken = default) =>
        await _db.Branches.AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.BranchName)
            .Select(b => new BranchOptionDto
            {
                Id = b.Id,
                BranchName = b.BranchName,
                Latitude = b.Latitude,
                Longitude = b.Longitude,
                Esp32DoorBaseUrl = b.Esp32DoorBaseUrl,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    public Task<BranchCrudDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _db.Branches.AsNoTracking().Where(b => b.Id == id).Select(ProjectRow).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<BranchCrudDto> CreateAsync(BranchCreateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateUpsertCoordinates(dto.Latitude, dto.Longitude);

        var name = dto.BranchName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Branch name is required.");

        if (dto.OrganizationId is { } oid)
        {
            var orgOk = await _db.Organizations.AnyAsync(o => o.Id == oid, cancellationToken).ConfigureAwait(false);
            if (!orgOk)
                throw new InvalidOperationException($"Organization {oid} was not found.");
        }

        var branch = new Branch
        {
            OrganizationId = dto.OrganizationId,
            BranchName = name,
            Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim(),
            ContactNumber = string.IsNullOrWhiteSpace(dto.ContactNumber) ? null : dto.ContactNumber.Trim(),
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Esp32DoorBaseUrl = NormalizeDoor(dto.Esp32DoorBaseUrl),
            IsActive = true,
        };

        _db.Branches.Add(branch);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return (await GetByIdAsync(branch.Id, cancellationToken).ConfigureAwait(false))!;
    }

    public async Task<BranchCrudDto> UpdateAsync(int id, BranchUpdateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateUpsertCoordinates(dto.Latitude, dto.Longitude);

        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == id, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"Branch {id} was not found.");

        var name = dto.BranchName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Branch name is required.");

        if (dto.OrganizationId is { } oid)
        {
            var orgOk = await _db.Organizations.AnyAsync(o => o.Id == oid, cancellationToken).ConfigureAwait(false);
            if (!orgOk)
                throw new InvalidOperationException($"Organization {oid} was not found.");
        }

        branch.OrganizationId = dto.OrganizationId;
        branch.BranchName = name;
        branch.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim();
        branch.ContactNumber = string.IsNullOrWhiteSpace(dto.ContactNumber) ? null : dto.ContactNumber.Trim();
        branch.Latitude = dto.Latitude;
        branch.Longitude = dto.Longitude;
        branch.Esp32DoorBaseUrl = NormalizeDoor(dto.Esp32DoorBaseUrl);
        branch.IsActive = dto.IsActive;

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return (await GetByIdAsync(id, cancellationToken).ConfigureAwait(false))!;
    }

    public async Task SoftDeactivateAsync(int id, CancellationToken cancellationToken = default)
    {
        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == id, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"Branch {id} was not found.");
        branch.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<OrganizationOptionDto>> OrganizationOptionsAsync(
        CancellationToken cancellationToken = default) =>
        await _db.Organizations.AsNoTracking()
            .Where(o => o.IsActive)
            .OrderBy(o => o.Name)
            .Select(o => new OrganizationOptionDto { Id = o.Id, Name = o.Name })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    private static void ValidateUpsertCoordinates(double? latitude, double? longitude)
    {
        if (latitude is { } lat && (lat < -90 || lat > 90))
            throw new InvalidOperationException("Latitude must be between -90 and 90.");
        if (longitude is { } lng && (lng < -180 || lng > 180))
            throw new InvalidOperationException("Longitude must be between -180 and 180.");
    }

    private static string? NormalizeDoor(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? null : raw.Trim().TrimEnd('/');
}
