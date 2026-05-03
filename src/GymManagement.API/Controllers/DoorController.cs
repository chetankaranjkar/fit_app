using GymManagement.API;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/door")]
public sealed class DoorController : ControllerBase
{
    private readonly IDoorUnlockService _door;
    private readonly IBranchQrAccessService _branchAccess;

    public DoorController(IDoorUnlockService door, IBranchQrAccessService branchAccess)
    {
        _door = door;
        _branchAccess = branchAccess;
    }

    /// <summary>Administrative/manual unlock (ESP32 POST <c>/unlock</c>).</summary>
    [HttpPost("unlock")]
    [Authorize(Policy = AuthPolicies.BranchConsole)]
    public async Task<ActionResult<DoorUnlockResponseDto>> Unlock(
        [FromBody] DoorUnlockRequestDto? body,
        CancellationToken cancellationToken)
    {
        string? branchDoorUrl = null;
        if (body?.BranchId is { } bid)
            branchDoorUrl = await _branchAccess.GetEsp32DoorBaseUrlAsync(bid, cancellationToken).ConfigureAwait(false);

        var trimmedBranch = string.IsNullOrWhiteSpace(branchDoorUrl) ? null : branchDoorUrl.Trim().TrimEnd('/');

        var ok = await _door.TryUnlockAsync(body?.DeviceBaseUrl, trimmedBranch, cancellationToken).ConfigureAwait(false);
        var dto = new DoorUnlockResponseDto
        {
            Success = ok,
            Message = ok ? "Door unlock endpoint responded OK." : "Door unlock failed or is not configured."
        };
        if (!ok)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, dto);
        return Ok(dto);
    }
}
