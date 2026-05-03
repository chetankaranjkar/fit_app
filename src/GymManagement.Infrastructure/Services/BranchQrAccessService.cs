using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class BranchQrAccessService : IBranchQrAccessService
{
    private readonly ApplicationDbContext _db;
    private readonly IBranchCrudService _crud;

    public BranchQrAccessService(ApplicationDbContext db, IBranchCrudService crud)
    {
        _db = db;
        _crud = crud;
    }

    public Task<IReadOnlyList<BranchOptionDto>> ListForQrConsoleAsync(
        CancellationToken cancellationToken = default) =>
        _crud.GetActiveBranchQrOptionsAsync(cancellationToken);

    public async Task UpdateQrAccessAsync(
        int branchId,
        BranchQrAccessPutDto dto,
        CancellationToken cancellationToken = default)
    {
        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"Branch {branchId} was not found.");

        if (dto.Latitude is { } lat && (lat < -90 || lat > 90))
            throw new InvalidOperationException("Latitude must be between -90 and 90.");
        if (dto.Longitude is { } lng && (lng < -180 || lng > 180))
            throw new InvalidOperationException("Longitude must be between -180 and 180.");

        branch.Latitude = dto.Latitude;
        branch.Longitude = dto.Longitude;
        branch.Esp32DoorBaseUrl = string.IsNullOrWhiteSpace(dto.Esp32DoorBaseUrl)
            ? null
            : dto.Esp32DoorBaseUrl.Trim().TrimEnd('/');

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<string?> GetEsp32DoorBaseUrlAsync(int branchId, CancellationToken cancellationToken = default)
    {
        return await _db.Branches.AsNoTracking()
            .Where(b => b.Id == branchId)
            .Select(b => b.Esp32DoorBaseUrl)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
    }
}
