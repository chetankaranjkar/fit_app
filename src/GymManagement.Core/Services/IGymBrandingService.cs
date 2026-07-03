using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IGymBrandingService
{
    Task<GymBrandingDto> GetAsync(CancellationToken ct = default);
    Task<GymBrandingDto> UpdateAsync(UpdateGymBrandingDto dto, CancellationToken ct = default);
    Task<GymBrandingDto> SetInvoiceLogoUrlAsync(string? invoiceLogoUrl, CancellationToken ct = default);
}
