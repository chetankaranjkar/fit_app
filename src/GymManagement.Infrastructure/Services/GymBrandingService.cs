using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class GymBrandingService : IGymBrandingService
{
    private readonly ApplicationDbContext _db;

    public GymBrandingService(ApplicationDbContext db) => _db = db;

    public async Task<GymBrandingDto> GetAsync(CancellationToken ct = default) =>
        MapToDto(await EnsureRowAsync(ct));

    public async Task<GymBrandingDto> UpdateAsync(UpdateGymBrandingDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.GymName))
            throw new ArgumentException("Gym name is required.");

        var row = await EnsureRowAsync(ct);
        row.GymName = dto.GymName.Trim();
        row.GymLogoUrl = NormalizeUrl(dto.GymLogoUrl);
        row.InvoiceLogoUrl = NormalizeUrl(dto.InvoiceLogoUrl);
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return MapToDto(row);
    }

    public async Task<GymBrandingDto> SetInvoiceLogoUrlAsync(string? invoiceLogoUrl, CancellationToken ct = default)
    {
        var row = await EnsureRowAsync(ct);
        row.InvoiceLogoUrl = NormalizeUrl(invoiceLogoUrl);
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return MapToDto(row);
    }

    private async Task<GymSetting> EnsureRowAsync(CancellationToken ct)
    {
        var row = await _db.GymSettings.FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row != null)
            return row;

        row = new GymSetting { Id = 1 };
        _db.GymSettings.Add(row);
        await _db.SaveChangesAsync(ct);
        return row;
    }

    private static GymBrandingDto MapToDto(GymSetting row) =>
        new()
        {
            GymName = string.IsNullOrWhiteSpace(row.GymName) ? "Gym Management" : row.GymName.Trim(),
            GymLogoUrl = row.GymLogoUrl,
            InvoiceLogoUrl = row.InvoiceLogoUrl,
        };

    private static string? NormalizeUrl(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
