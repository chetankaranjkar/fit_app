using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

/// <summary>Gym name and invoice logo branding stored in GymSettings.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[HasPermissionOrAdmin(PermissionCodes.Config)]
public class GymBrandingController : ControllerBase
{
    private readonly IGymBrandingService _branding;
    private readonly WebRootImageStorage _storage;

    public GymBrandingController(IGymBrandingService branding, WebRootImageStorage storage)
    {
        _branding = branding;
        _storage = storage;
    }

    [HttpGet]
    public async Task<ActionResult<GymBrandingDto>> Get(CancellationToken ct) =>
        Ok(await _branding.GetAsync(ct));

    [HttpPut]
    public async Task<ActionResult<GymBrandingDto>> Update([FromBody] UpdateGymBrandingDto dto, CancellationToken ct)
    {
        try
        {
            return Ok(await _branding.UpdateAsync(dto, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("invoice-logo")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<GymBrandingDto>> UploadInvoiceLogo(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded. Use multipart form field named 'file'." });

        try
        {
            var current = await _branding.GetAsync(ct);
            var (imageUrl, _) = await _storage.SaveAsync(
                file,
                "uploads/branding",
                5 * 1024 * 1024,
                prefixToCleanup: "invoice_logo_",
                namePrefix: "invoice_logo_",
                previousManagedImageUrl: current.InvoiceLogoUrl,
                cancellationToken: ct);
            return Ok(await _branding.SetInvoiceLogoUrlAsync(imageUrl, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
