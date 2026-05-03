using GymManagement.API;
using GymManagement.API.Middleware;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/qr")]
[Authorize]
public sealed class QrController : ControllerBase
{
    private readonly IGymQrService _qr;
    private readonly IBranchQrAccessService _branchAccess;

    public QrController(IGymQrService qr, IBranchQrAccessService branchAccess)
    {
        _qr = qr;
        _branchAccess = branchAccess;
    }

    [HttpPost("generate")]
    [Authorize(Policy = AuthPolicies.BranchConsole)]
    public async Task<ActionResult<QrGenerateResponseDto>> Generate(
        [FromBody] QrGenerateRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var dto = await _qr.GenerateAsync(request.BranchId, cancellationToken).ConfigureAwait(false);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Lists branches with geo / door fields (same payload as <c>GET /api/branches</c>).</summary>
    [HttpGet("branches")]
    [Authorize(Policy = AuthPolicies.BranchConsole)]
    public async Task<ActionResult<IReadOnlyList<BranchOptionDto>>> BranchesLegacy(CancellationToken cancellationToken)
    {
        var list = await _branchAccess.ListForQrConsoleAsync(cancellationToken).ConfigureAwait(false);
        return Ok(list);
    }

    [HttpGet("owner-dashboard")]
    [Authorize(Policy = AuthPolicies.BranchConsole)]
    public async Task<ActionResult<QrOwnerDashboardDto>> OwnerDashboard(
        [FromQuery] int branchId,
        CancellationToken cancellationToken)
    {
        try
        {
            var dto = await _qr.GetOwnerDashboardAsync(branchId, cancellationToken).ConfigureAwait(false);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("scan")]
    public async Task<ActionResult<QrScanResponseDto>> Scan(
        [FromBody] QrScanRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = GetProfileUserId();
        if (!userId.HasValue)
            return Unauthorized();

        var result = await _qr.ScanAsync(request, userId.Value, cancellationToken).ConfigureAwait(false);

        if (result.Success)
            return Ok(result);

        if (result.Message?.Contains("5 minutes", StringComparison.OrdinalIgnoreCase) == true)
            return Conflict(result);

        return BadRequest(result);
    }

    private int? GetProfileUserId()
    {
        var v = HttpContext.Items[JwtUserContextMiddleware.ProfileUserIdKey]?.ToString();
        if (!string.IsNullOrEmpty(v) && int.TryParse(v, out var id))
            return id;
        return null;
    }
}
