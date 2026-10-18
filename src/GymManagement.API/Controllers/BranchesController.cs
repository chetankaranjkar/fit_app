using GymManagement.API;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

/// <summary>Branches: directory CRUD, geo/door PUT for QR (see <see cref="AuthPolicies.BranchConsole"/>).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.BranchConsole)]
public sealed class BranchesController : ControllerBase
{
    private readonly IBranchQrAccessService _branchQr;
    private readonly IBranchCrudService _branchCrud;
    private readonly ICurrentUserAccessContext _access;

    public BranchesController(IBranchQrAccessService branchQr, IBranchCrudService branchCrud, ICurrentUserAccessContext access)
    {
        _branchQr = branchQr;
        _branchCrud = branchCrud;
        _access = access;
    }

    /// <summary>Full branch rows for admin; use <paramref name="activeOnly"/> true for QR dropdowns.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BranchCrudDto>>> List(
        [FromQuery] bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        var list = await _branchCrud.ListAsync(activeOnly, cancellationToken).ConfigureAwait(false);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BranchCrudDto>> Get(int id, CancellationToken cancellationToken = default)
    {
        var row = await _branchCrud.GetByIdAsync(id, cancellationToken).ConfigureAwait(false);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpGet("lookup/organizations")]
    public async Task<ActionResult<IReadOnlyList<OrganizationOptionDto>>> OrganizationLookup(
        CancellationToken cancellationToken = default)
    {
        var list = await _branchCrud.OrganizationOptionsAsync(cancellationToken).ConfigureAwait(false);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<BranchCrudDto>> Create(
        [FromBody] BranchCreateDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var created = await _branchCrud.CreateAsync(dto, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BranchCrudDto>> Update(
        int id,
        [FromBody] BranchUpdateDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var updated = await _branchCrud.UpdateAsync(id, dto, cancellationToken).ConfigureAwait(false);
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Deactivate(int id, CancellationToken cancellationToken = default)
    {
        try
        {
            await _branchCrud.SoftDeactivateAsync(id, handlingPolicy: null, actingUserId: null, cancellationToken).ConfigureAwait(false);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public sealed class CloseBranchRequest
    {
        public string? HandlingPolicy { get; set; }
    }

    [HttpGet("{id:int}/deactivation-preview")]
    public async Task<ActionResult> DeactivationPreview(int id, CancellationToken cancellationToken = default)
    {
        try
        {
            var counts = await _branchCrud.PreviewDeactivationAsync(id, cancellationToken).ConfigureAwait(false);
            return Ok(new
            {
                counts.ActiveMembers,
                counts.HomeUsers,
                counts.StaffAssignments,
                counts.OccupiedLockers,
                counts.EquipmentAssets,
                counts.StockOnHand,
                counts.OpenBookings,
                counts.OutstandingBills,
                canDeactivateWithoutPolicy = GymManagement.Core.Branching.OperationalBranchRules.CanDeactivate(counts),
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/close")]
    public async Task<ActionResult> Close(int id, [FromBody] CloseBranchRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            await _branchCrud.SoftDeactivateAsync(id, request.HandlingPolicy, _access.ActorProfileUserId, cancellationToken).ConfigureAwait(false);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/qr-access")]
    public async Task<ActionResult> UpdateQrAccess(
        int id,
        [FromBody] BranchQrAccessPutDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _branchQr.UpdateQrAccessAsync(id, dto, cancellationToken).ConfigureAwait(false);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
