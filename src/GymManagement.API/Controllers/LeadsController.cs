using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class LeadsController : ControllerBase
{
    private readonly ILeadService _leads;
    private readonly IHttpContextAccessor _http;
    private readonly ApplicationDbContext _db;

    public LeadsController(ILeadService leads, IHttpContextAccessor http, ApplicationDbContext db)
    {
        _leads = leads;
        _http = http;
        _db = db;
    }

    [HttpGet("trainer-options")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<IReadOnlyList<LeadTrainerOptionDto>>> TrainerOptions(CancellationToken cancellationToken)
    {
        var rows = await _db.Trainers.AsNoTracking()
            .Where(t => t.IsActive)
            .Join(
                _db.Users.AsNoTracking(),
                t => t.UserId,
                u => u.Id,
                (t, u) => new LeadTrainerOptionDto
                {
                    Id = t.Id,
                    Name = (u.FirstName + " " + u.LastName).Trim(),
                })
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return Ok(rows);
    }

    [HttpGet("conversion/plans")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<IReadOnlyList<MembershipPlanOptionDto>>> ConversionPlans(CancellationToken cancellationToken)
    {
        var plans = await _db.MembershipPlans.AsNoTracking()
            .OrderBy(p => p.PlanName)
            .Select(p => new MembershipPlanOptionDto
            {
                Id = p.Id,
                PlanName = p.PlanName,
                DurationDays = p.DurationDays,
                Price = p.Price,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return Ok(plans);
    }

    [HttpGet("reception-dashboard")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<ReceptionDashboardDto>> ReceptionDashboard(CancellationToken cancellationToken)
    {
        var dto = await _leads.GetReceptionDashboardAsync(cancellationToken).ConfigureAwait(false);
        return Ok(dto);
    }

    [HttpGet("analytics")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<LeadAnalyticsDto>> Analytics(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var m = month ?? DateTime.UtcNow.Month;
        var dto = await _leads.GetAnalyticsAsync(y, m, cancellationToken).ConfigureAwait(false);
        return Ok(dto);
    }

    [HttpGet("kanban")]
    public async Task<ActionResult<LeadKanbanDto>> Kanban(CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(requireCrm: false).ConfigureAwait(false);
        if (scope is null)
            return Forbid();
        var dto = await _leads.GetKanbanAsync(scope.Value, cancellationToken).ConfigureAwait(false);
        return Ok(dto);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GymLeadSummaryDto>>> List(
        [FromQuery] LeadPipelineStatus? status,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(requireCrm: false).ConfigureAwait(false);
        if (scope is null)
            return Forbid();
        var rows = await _leads.GetLeadsAsync(status, scope.Value, cancellationToken).ConfigureAwait(false);
        return Ok(rows);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GymLeadDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(requireCrm: false).ConfigureAwait(false);
        if (scope is null)
            return Forbid();
        var row = await _leads.GetLeadDetailAsync(id, scope.Value, cancellationToken).ConfigureAwait(false);
        if (row == null)
            return NotFound();
        return Ok(row);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<GymLeadDetailDto>> Create([FromBody] CreateGymLeadDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var row = await _leads.CreateLeadAsync(dto, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(Get), new { id = row.Id }, row);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<GymLeadDetailDto>> Update(int id, [FromBody] UpdateGymLeadDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var row = await _leads.UpdateLeadAsync(id, dto, cancellationToken).ConfigureAwait(false);
            if (row == null)
                return NotFound();
            return Ok(row);
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            var ok = await _leads.SoftDeleteLeadAsync(id, cancellationToken).ConfigureAwait(false);
            if (!ok)
                return NotFound();
            return NoContent();
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:int}/status")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<GymLeadDetailDto>> PatchStatus(
        int id,
        [FromBody] SetLeadStatusDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await _leads.SetStatusAsync(id, dto.Status, cancellationToken).ConfigureAwait(false);
            if (row == null)
                return NotFound();
            return Ok(row);
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/followups")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<LeadFollowupDto>> AddFollowup(
        int id,
        [FromBody] CreateLeadFollowupDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var profileUserId = _http.HttpContext?.GetJwtProfileUserId();
            var row = await _leads.AddFollowupAsync(id, dto, profileUserId, cancellationToken).ConfigureAwait(false);
            return Ok(row);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/trials")]
    public async Task<ActionResult<LeadTrialDto>> AddTrial(
        int id,
        [FromBody] CreateLeadTrialDto dto,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.HasPermission(PermissionCodes.LeadsCrm))
            return Forbid();
        try
        {
            var row = await _leads.AddTrialAsync(id, dto, cancellationToken).ConfigureAwait(false);
            return Ok(row);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:int}/trials/{trialId:int}")]
    public async Task<ActionResult<LeadTrialDto>> PatchTrial(
        int id,
        int trialId,
        [FromBody] UpdateLeadTrialDto dto,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(requireCrm: false).ConfigureAwait(false);
        if (scope is null)
            return Forbid();
        try
        {
            var row = await _leads.UpdateTrialAsync(id, trialId, dto, scope.Value, cancellationToken).ConfigureAwait(false);
            if (row == null)
                return NotFound();
            return Ok(row);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Completes lead conversion using the existing member-creation pipeline (requires CREATE_MEMBER).</summary>
    [HttpPost("{id:int}/convert")]
    [HasPermission(PermissionCodes.LeadsCrm)]
    public async Task<ActionResult<LeadConversionResultDto>> Convert(
        int id,
        [FromBody] ConvertLeadToMemberDto dto,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.HasPermission(PermissionCodes.CREATE_MEMBER))
            return Forbid();

        try
        {
            var result = await _leads.ConvertToMemberAsync(id, dto, cancellationToken).ConfigureAwait(false);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    private async Task<LeadAccessScope?> ResolveScopeAsync(bool requireCrm)
    {
        var http = _http.HttpContext;
        if (http == null)
            return null;

        if (http.HasPermission(PermissionCodes.LeadsCrm))
            return new LeadAccessScope(true, null);

        if (!requireCrm && http.HasPermission(PermissionCodes.LeadsTrainer))
        {
            var profileUserId = http.GetJwtProfileUserId();
            if (profileUserId is null or <= 0)
                return null;
            var trainerId = await ResolveTrainerIdForProfileUserAsync(profileUserId.Value).ConfigureAwait(false);
            if (trainerId is null)
                return null;
            return new LeadAccessScope(false, trainerId.Value);
        }

        return null;
    }

    private Task<int?> ResolveTrainerIdForProfileUserAsync(int profileUserId) =>
        _db.Trainers.AsNoTracking()
            .Where(t => t.UserId == profileUserId)
            .Select(t => (int?)t.Id)
            .FirstOrDefaultAsync();
}
