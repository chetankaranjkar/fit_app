using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/workout-plan-audit")]
[Authorize]
public class WorkoutPlanAuditController : ControllerBase
{
    private readonly IWorkoutPlanAuditService _service;

    public WorkoutPlanAuditController(IWorkoutPlanAuditService service) => _service = service;

    [HttpGet]
    [HasPermissionOrAdmin(PermissionCodes.ViewWorkoutPlanAudit)]
    public async Task<IActionResult> List(
        [FromQuery] int? memberUserId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] WorkoutPlanAuditAction? action,
        [FromQuery] int take,
        CancellationToken ct = default)
    {
        var logs = await _service.ListAsync(
            new WorkoutPlanAuditListQuery
            {
                MemberUserId = memberUserId,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                Action = action,
                Take = take > 0 ? take : 200,
            },
            ct);
        return Ok(logs);
    }
}
