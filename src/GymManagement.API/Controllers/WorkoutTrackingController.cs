using GymManagement.API.Middleware;
using GymManagement.Core.DTOs.WorkoutTracking;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

/// <summary>
/// Live workout tracking (Strong/Hevy-style). Plan templates remain on <c>WorkoutPlans</c>;
/// performed sets are stored in <c>WorkoutSessionExercises</c>.
/// </summary>
[ApiController]
[Route("api/workout")]
[Authorize]
public sealed class WorkoutTrackingController : ControllerBase
{
    private readonly IWorkoutTrackingService _tracking;

    public WorkoutTrackingController(IWorkoutTrackingService tracking)
    {
        _tracking = tracking;
    }

    [HttpPost("start")]
    [ProducesResponseType(typeof(ActiveWorkoutSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActiveWorkoutSessionDto>> Start(
        [FromBody] StartWorkoutRequestDto dto,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _tracking.StartAsync(dto, ResolveUserId(), ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpGet("active/{memberId:int}")]
    [ProducesResponseType(typeof(ActiveWorkoutSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActiveWorkoutSessionDto>> GetActive(int memberId, CancellationToken ct)
    {
        try
        {
            var active = await _tracking.GetActiveAsync(memberId, ResolveUserId(), ct);
            return active == null ? NotFound(new { message = "No active workout." }) : Ok(active);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("log-set")]
    [ProducesResponseType(typeof(WorkoutSessionExerciseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionExerciseDto>> LogSet(
        [FromBody] LogWorkoutSetRequestDto dto,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _tracking.LogSetAsync(dto, ResolveUserId(), ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("complete/{sessionId:int}")]
    [ProducesResponseType(typeof(ActiveWorkoutSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActiveWorkoutSessionDto>> Complete(
        int sessionId,
        [FromQuery] decimal? caloriesBurned,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _tracking.CompleteAsync(sessionId, ResolveUserId(), caloriesBurned, ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("exercise-history/{memberId:int}/{exerciseId:int}")]
    [ProducesResponseType(typeof(WorkoutExerciseHistoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutExerciseHistoryDto>> ExerciseHistory(
        int memberId,
        int exerciseId,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await _tracking.GetExerciseHistoryAsync(memberId, exerciseId, ResolveUserId(), take, ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("dashboard/{memberId:int}")]
    [ProducesResponseType(typeof(WorkoutDashboardDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutDashboardDto>> Dashboard(int memberId, CancellationToken ct)
    {
        try
        {
            return Ok(await _tracking.GetDashboardAsync(memberId, ResolveUserId(), ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    /// <summary>Resolve <see cref="Member"/> id for the logged-in user (member app).</summary>
    [HttpGet("my-member-id")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<ActionResult> MyMemberId(CancellationToken ct)
    {
        var userId = ResolveUserId();
        if (!userId.HasValue) return Unauthorized();
        var memberId = await _tracking.ResolveMemberIdForUserAsync(userId.Value, ct);
        return memberId == null ? NotFound(new { message = "Member profile not found." }) : Ok(new { memberId });
    }

    /// <summary>Trainer view: recent workouts for assigned members.</summary>
    [HttpGet("trainer/members")]
    [ProducesResponseType(typeof(IReadOnlyList<MemberWorkoutSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MemberWorkoutSummaryDto>>> TrainerMemberWorkouts(
        [FromQuery] int take = 30,
        CancellationToken ct = default)
    {
        var userId = ResolveUserId();
        if (!userId.HasValue) return Unauthorized();
        return Ok(await _tracking.GetMemberSummariesForTrainerAsync(userId.Value, take, ct));
    }

    private int? ResolveUserId()
    {
        var v = HttpContext.Items[JwtUserContextMiddleware.ProfileUserIdKey]?.ToString();
        return int.TryParse(v, out var id) ? id : null;
    }
}
