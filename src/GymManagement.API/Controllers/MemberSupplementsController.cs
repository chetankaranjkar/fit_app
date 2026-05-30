using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.Supplements;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MemberSupplementsController : ControllerBase
{
    private readonly ISupplementTrackingService _service;

    public MemberSupplementsController(ISupplementTrackingService service)
    {
        _service = service;
    }

    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyList<MemberSupplementDto>>> GetMine(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.GetJwtProfileUserId();
        if (userId == null) return Unauthorized();
        return Ok(await _service.GetByUserIdAsync(userId.Value, activeOnly, cancellationToken));
    }

    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<IReadOnlyList<MemberSupplementDto>>> GetByUser(
        int userId,
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        if (!await AuthorizeAccessAsync(userId, cancellationToken)) return Forbid();
        return Ok(await _service.GetByUserIdAsync(userId, activeOnly, cancellationToken));
    }

    [HttpGet("user/{userId:int}/history")]
    public async Task<ActionResult<IReadOnlyList<MemberSupplementDto>>> GetHistoryByUser(
        int userId,
        CancellationToken cancellationToken = default)
    {
        if (!await AuthorizeAccessAsync(userId, cancellationToken)) return Forbid();
        return Ok(await _service.GetHistoryByUserIdAsync(userId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<MemberSupplementDto>> Assign(
        [FromBody] CreateMemberSupplementDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!CanManageAssignments()) return Forbid();
        if (!await AuthorizeAccessAsync(dto.UserId, cancellationToken)) return Forbid();

        var assignedBy = HttpContext.GetJwtProfileUserId();
        if (assignedBy == null) return Unauthorized();

        try
        {
            var result = await _service.AssignAsync(dto, assignedBy.Value, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MemberSupplementDto>> Update(
        int id,
        [FromBody] UpdateMemberSupplementDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!CanManageAssignments()) return Forbid();
        var targetUserId = await _service.GetAssignmentUserIdAsync(id, cancellationToken);
        if (targetUserId == null) return NotFound();
        if (!await AuthorizeAccessAsync(targetUserId.Value, cancellationToken)) return Forbid();
        try
        {
            return Ok(await _service.UpdateAssignmentAsync(id, dto, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("analytics")]
    [HasPermission(PermissionCodes.UsersAccess)]
    public async Task<ActionResult<SupplementAnalyticsDto>> GetAnalytics(CancellationToken cancellationToken = default)
        => Ok(await _service.GetAnalyticsAsync(cancellationToken));

    private bool CanManageAssignments() =>
        User.HasClaim("permission", PermissionCodes.UsersAccess) ||
        User.HasClaim("permission", PermissionCodes.MANAGE_MEMBERS) ||
        User.HasClaim("permission", PermissionCodes.TrainerAccess);

    private async Task<bool> AuthorizeAccessAsync(int targetUserId, CancellationToken cancellationToken)
    {
        var requestingUserId = HttpContext.GetJwtProfileUserId();
        if (requestingUserId == null) return false;

        var hasUsersAccess = User.HasClaim("permission", PermissionCodes.UsersAccess) ||
                             User.HasClaim("permission", PermissionCodes.MANAGE_MEMBERS);
        var hasTrainerAccess = User.HasClaim("permission", PermissionCodes.TrainerAccess);

        return await _service.CanAccessMemberSupplementsAsync(
            requestingUserId.Value,
            targetUserId,
            hasUsersAccess,
            hasTrainerAccess,
            cancellationToken);
    }
}
