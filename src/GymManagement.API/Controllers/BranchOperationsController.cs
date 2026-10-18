using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/branch-operations")]
[Authorize]
public sealed class BranchOperationsController : ControllerBase
{
    private readonly IBranchAssignmentService _branches;
    private readonly IOperationalBranchService _operations;
    private readonly IBranchScopeService _scope;
    private readonly ICurrentUserAccessContext _access;

    public BranchOperationsController(
        IBranchAssignmentService branches,
        IOperationalBranchService operations,
        IBranchScopeService scope,
        ICurrentUserAccessContext access)
    {
        _branches = branches;
        _operations = operations;
        _scope = scope;
        _access = access;
    }

    public sealed class TransferMemberRequest
    {
        public int UserId { get; set; }
        public int ToBranchId { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool UpdateMembershipAccess { get; set; }
        public string? AccessDecision { get; set; }
        public string? FinancialDecision { get; set; }
        public List<int>? SelectedBranchIds { get; set; }
    }

    public sealed class SetPlanPriceRequest
    {
        public int PlanId { get; set; }
        public int BranchId { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; } = true;
    }

    [HttpGet("unassigned-report")]
    public async Task<IActionResult> Unassigned(CancellationToken cancellationToken)
    {
        try
        {
            var report = await _scope.UnassignedAsync(cancellationToken).ConfigureAwait(false);
            return Ok(report);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    public sealed class BulkAssignRequest
    {
        public List<int> Ids { get; set; } = new();
        public int BranchId { get; set; }
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> Metrics([FromQuery] int? branchId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        try
        {
            var metrics = await _scope.MetricsAsync(branchId, fromDate ?? today, toDate ?? today, cancellationToken).ConfigureAwait(false);
            return Ok(metrics);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("assign-missing-home-branches")]
    public async Task<IActionResult> AssignMissingHomes([FromBody] BulkAssignRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _scope.AssignMissingHomeBranchesAsync(request.Ids, request.BranchId, cancellationToken).ConfigureAwait(false);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("assign-missing-interested-branches")]
    public async Task<IActionResult> AssignMissingLeads([FromBody] BulkAssignRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _scope.AssignMissingInterestedBranchesAsync(request.Ids, request.BranchId, cancellationToken).ConfigureAwait(false);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("scope")]
    public async Task<IActionResult> Scope(CancellationToken cancellationToken)
    {
        var view = await _scope.DescribeAsync(cancellationToken).ConfigureAwait(false);
        return Ok(view);
    }

    [HttpGet("plan-offers")]
    public async Task<IActionResult> PlanOffers([FromQuery] int branchId, CancellationToken cancellationToken)
    {
        try
        {
            await _scope.RequireAssignableBranchAsync(branchId, null, cancellationToken).ConfigureAwait(false);
            var offers = await _branches.ListOffersAsync(branchId, cancellationToken).ConfigureAwait(false);
            return Ok(offers);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("plan-prices")]
    public async Task<IActionResult> PlanPrices([FromQuery] int planId, CancellationToken cancellationToken)
    {
        var scope = await _scope.CurrentAsync(cancellationToken).ConfigureAwait(false);
        IReadOnlyCollection<int>? limit = scope.IsUnrestricted ? null : scope.BranchIds.ToArray();
        try
        {
            var rows = await _branches.GetPlanBranchPricesAsync(planId, limit, cancellationToken).ConfigureAwait(false);
            return Ok(rows);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("plan-prices")]
    public async Task<IActionResult> SetPlanPrice([FromBody] SetPlanPriceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _scope.RequireAssignableBranchAsync(request.BranchId, null, cancellationToken).ConfigureAwait(false);
            await _branches.SetPlanBranchPriceAsync(request.PlanId, request.BranchId, request.Price, request.IsAvailable, cancellationToken).ConfigureAwait(false);
            return Ok(new { saved = true });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("transfers")]
    public async Task<IActionResult> Transfer([FromBody] TransferMemberRequest request, CancellationToken cancellationToken)
    {
        if (_access.ActorProfileUserId is not int actorId)
            return Unauthorized();
        try
        {
            await _branches.TransferMemberAsync(
                request.UserId,
                request.ToBranchId,
                request.EffectiveDate == default ? DateTime.UtcNow.Date : request.EffectiveDate,
                request.Reason,
                actorId,
                request.AccessDecision,
                request.FinancialDecision,
                request.SelectedBranchIds,
                request.UpdateMembershipAccess,
                cancellationToken).ConfigureAwait(false);
            return Ok(new { transferred = true, financialDecision = "Unchanged" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public sealed class TransferEquipmentRequest
    {
        public int EquipmentId { get; set; }
        public int ToBranchId { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public sealed class TransferStockRequest
    {
        public int ProductId { get; set; }
        public int FromBranchId { get; set; }
        public int ToBranchId { get; set; }
        public int Quantity { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public sealed class SetPackageBranchPriceRequest
    {
        public int PackageId { get; set; }
        public int BranchId { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; } = true;
    }

    [HttpPost("equipment-transfers")]
    public async Task<IActionResult> TransferEquipment([FromBody] TransferEquipmentRequest request, CancellationToken cancellationToken)
    {
        if (_access.ActorProfileUserId is not int actorId)
            return Unauthorized();
        try
        {
            await _operations.TransferEquipmentAsync(request.EquipmentId, request.ToBranchId, request.EffectiveDate == default ? DateTime.UtcNow.Date : request.EffectiveDate, request.Reason, actorId, cancellationToken);
            return Ok(new { transferred = true });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    public sealed class TransferLockerRequest
    {
        public int LockerId { get; set; }
        public int ToBranchId { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    [HttpPost("locker-transfers")]
    public async Task<IActionResult> TransferLocker([FromBody] TransferLockerRequest request, CancellationToken cancellationToken)
    {
        if (_access.ActorProfileUserId is not int actorId)
            return Unauthorized();
        try
        {
            await _operations.TransferLockerAsync(request.LockerId, request.ToBranchId, request.EffectiveDate == default ? DateTime.UtcNow.Date : request.EffectiveDate, request.Reason, actorId, cancellationToken);
            return Ok(new { transferred = true });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("stock-transfers")]
    public async Task<IActionResult> TransferStock([FromBody] TransferStockRequest request, CancellationToken cancellationToken)
    {
        if (_access.ActorProfileUserId is not int actorId)
            return Unauthorized();
        try
        {
            await _operations.TransferStockAsync(request.ProductId, request.FromBranchId, request.ToBranchId, request.Quantity, request.EffectiveDate == default ? DateTime.UtcNow.Date : request.EffectiveDate, request.Reason, actorId, cancellationToken);
            return Ok(new { transferred = true });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("pt-package-prices")]
    public async Task<IActionResult> SetPackagePrice([FromBody] SetPackageBranchPriceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _operations.SetPackageBranchPriceAsync(request.PackageId, request.BranchId, request.Price, request.IsAvailable, cancellationToken);
            return Ok(new { saved = true });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
