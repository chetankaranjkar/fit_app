using GymManagement.API.Extensions;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymManagement.Infrastructure.Data;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/personal-workout-plans")]
[Authorize]
public class PersonalWorkoutPlansController : ControllerBase
{
    private readonly IPersonalWorkoutPlanService _personalPlans;
    private readonly IWorkoutPlanService _workoutPlanService;
    private readonly IWorkoutPlanAuditService _audit;
    private readonly IPersonalWorkoutPlanAccessService _access;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _db;

    public PersonalWorkoutPlansController(
        IPersonalWorkoutPlanService personalPlans,
        IWorkoutPlanService workoutPlanService,
        IWorkoutPlanAuditService audit,
        IPersonalWorkoutPlanAccessService access,
        IUnitOfWork unitOfWork,
        ApplicationDbContext db)
    {
        _personalPlans = personalPlans;
        _workoutPlanService = workoutPlanService;
        _audit = audit;
        _access = access;
        _unitOfWork = unitOfWork;
        _db = db;
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<WorkoutPlanDto>>> ListMine(CancellationToken ct)
    {
        var userId = await ResolveProfileUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        var roles = User.GetAppRoleNames();
        if (_access.IsAdmin(roles))
            return BadRequest(new { message = "Use admin program APIs for non-member context." });

        return Ok(await _personalPlans.ListForMemberAsync(userId.Value, ct));
    }

    [HttpPost("mine")]
    public async Task<ActionResult<WorkoutPlanDto>> CreateMine(
        CreatePersonalWorkoutPlanDto dto,
        CancellationToken ct)
    {
        var userId = await ResolveProfileUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        var roles = User.GetAppRoleNames();
        if (roles.Any(r => string.Equals(r, "TRAINER", StringComparison.OrdinalIgnoreCase)))
            return Forbid();

        try
        {
            var (performerId, performerName) = await ResolvePerformerAsync(userId.Value, ct);
            var created = await _personalPlans.CreateForMemberAsync(
                userId.Value,
                dto,
                performerId,
                performerName,
                ct);
            if (created == null) return BadRequest();
            return CreatedAtAction(nameof(ListMine), created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("mine/{id:int}")]
    public async Task<ActionResult<WorkoutPlanDto>> GetMine(int id, CancellationToken ct)
    {
        var userId = await ResolveProfileUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        var plan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
        if (plan == null || plan.IsDeleted) return NotFound();

        var roles = User.GetAppRoleNames();
        if (!_access.CanAccessPersonalPlan(userId.Value, roles, plan))
            return Forbid();

        var dto = await _workoutPlanService.GetWorkoutPlanByIdAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPut("mine/{id:int}/structure")]
    public async Task<ActionResult<WorkoutPlanDto>> SaveMineStructure(
        int id,
        SaveProgramStructureDto dto,
        CancellationToken ct)
    {
        var userId = await ResolveProfileUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        var plan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
        if (plan == null || plan.IsDeleted) return NotFound();

        var roles = User.GetAppRoleNames();
        if (!_access.CanAccessPersonalPlan(userId.Value, roles, plan))
            return Forbid();

        var (performerId, performerName) = await ResolvePerformerAsync(userId.Value, ct);
        var updated = await _workoutPlanService.SaveProgramStructureAsync(id, dto, performerId, performerName, ct);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("mine/{id:int}")]
    public async Task<IActionResult> DeleteMine(int id, CancellationToken ct)
    {
        var userId = await ResolveProfileUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        var plan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
        if (plan == null) return NotFound();

        var roles = User.GetAppRoleNames();
        if (!_access.CanAccessPersonalPlan(userId.Value, roles, plan))
            return Forbid();

        var (performerId, performerName) = await ResolvePerformerAsync(userId.Value, ct);
        var ok = await _audit.DeletePersonalWorkoutPlanWithAuditAsync(id, performerId, performerName, ct);
        return ok ? NoContent() : NotFound();
    }

    private async Task<int?> ResolveProfileUserIdAsync(CancellationToken ct)
    {
        var fromClaims = User.GetProfileUserId();
        if (fromClaims != null) return fromClaims;

        var authUserId = User.GetAuthUserId();
        if (authUserId == null) return null;

        var auth = await _db.AuthUsers.AsNoTracking().FirstOrDefaultAsync(a => a.Id == authUserId.Value, ct);
        return auth?.UserId;
    }

    private async Task<(int Id, string Name)> ResolvePerformerAsync(int fallbackUserId, CancellationToken ct)
    {
        var userId = await ResolveProfileUserIdAsync(ct) ?? fallbackUserId;
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        var name = user == null ? "User" : $"{user.FirstName} {user.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(name)) name = $"User #{userId}";
        return (userId, name);
    }
}
