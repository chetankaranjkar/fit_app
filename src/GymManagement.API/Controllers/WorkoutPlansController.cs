using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using GymManagement.Infrastructure.Data;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/Programs")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class WorkoutPlansController : ControllerBase
    {
        private readonly IWorkoutPlanService _workoutPlanService;
        private readonly IPersonalWorkoutPlanAccessService _personalPlanAccess;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _db;

        public WorkoutPlansController(
            IWorkoutPlanService workoutPlanService,
            IPersonalWorkoutPlanAccessService personalPlanAccess,
            IUnitOfWork unitOfWork,
            ApplicationDbContext db)
        {
            _workoutPlanService = workoutPlanService;
            _personalPlanAccess = personalPlanAccess;
            _unitOfWork = unitOfWork;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkoutPlanDto>>> GetAllWorkoutPlans()
        {
            var workoutPlans = await _workoutPlanService.GetAllWorkoutPlansAsync();
            return Ok(workoutPlans);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WorkoutPlanDto>> GetWorkoutPlan(int id)
        {
            var entity = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (entity == null)
                return NotFound();
            if (!await CanAccessPlanAsync(entity))
                return Forbid();

            var workoutPlan = await _workoutPlanService.GetWorkoutPlanByIdAsync(id);
            if (workoutPlan == null)
                return NotFound();
            return Ok(workoutPlan);
        }

        [HttpGet("type/{workoutType}")]
        public async Task<ActionResult<IEnumerable<WorkoutPlanDto>>> GetWorkoutPlansByType(WorkoutType workoutType)
        {
            var workoutPlans = await _workoutPlanService.GetWorkoutPlansByTypeAsync(workoutType);
            return Ok(workoutPlans);
        }

        [HttpPost]
        public async Task<ActionResult<WorkoutPlanDto>> CreateWorkoutPlan(CreateWorkoutPlanDto createWorkoutPlanDto)
        {
            var workoutPlan = await _workoutPlanService.CreateWorkoutPlanAsync(createWorkoutPlanDto);
            return CreatedAtAction(nameof(GetWorkoutPlan), new { id = workoutPlan.Id }, workoutPlan);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<WorkoutPlanDto>> UpdateWorkoutPlan(int id, CreateWorkoutPlanDto updateWorkoutPlanDto)
        {
            var workoutPlan = await _workoutPlanService.UpdateWorkoutPlanAsync(id, updateWorkoutPlanDto);
            if (workoutPlan == null)
                return NotFound();
            return Ok(workoutPlan);
        }

        [HttpPut("{id}/structure")]
        public async Task<ActionResult<WorkoutPlanDto>> SaveProgramStructure(int id, SaveProgramStructureDto dto, CancellationToken ct)
        {
            var entity = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (entity == null)
                return NotFound();
            if (!await CanAccessPlanAsync(entity))
                return Forbid();

            var (performerId, performerName) = await ResolvePerformerAsync(ct);
            var plan = await _workoutPlanService.SaveProgramStructureAsync(
                id,
                dto,
                performerId,
                performerName,
                ct);
            if (plan == null) return NotFound();
            return Ok(plan);
        }

        [HttpPost("{id}/clone")]
        public async Task<ActionResult<WorkoutPlanDto>> CloneProgram(int id, [FromBody] CloneWorkoutPlanDto? dto)
        {
            dto ??= new CloneWorkoutPlanDto();
            var plan = await _workoutPlanService.CloneWorkoutPlanAsync(id, dto);
            if (plan == null) return NotFound();
            return CreatedAtAction(nameof(GetWorkoutPlan), new { id = plan.Id }, plan);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorkoutPlan(int id, CancellationToken ct)
        {
            var entity = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (entity == null)
                return NotFound();
            if (!await CanAccessPlanAsync(entity))
                return Forbid();

            var (performerId, performerName) = await ResolvePerformerAsync(ct);
            if (performerId == null)
                return Unauthorized();

            try
            {
                var result = await _workoutPlanService.DeleteWorkoutPlanAsync(
                    id,
                    performerId.Value,
                    performerName,
                    ct);
                if (!result)
                    return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task<bool> CanAccessPlanAsync(WorkoutPlan plan)
        {
            if (!string.Equals(plan.PlanType, WorkoutPlanTypes.Personal, StringComparison.OrdinalIgnoreCase))
                return true;

            var userId = await ResolveProfileUserIdAsync();
            if (userId == null)
                return false;

            return _personalPlanAccess.CanAccessPersonalPlan(userId.Value, User.GetAppRoleNames(), plan);
        }

        private async Task<int?> ResolveProfileUserIdAsync()
        {
            var fromClaims = User.GetProfileUserId();
            if (fromClaims != null) return fromClaims;

            var authUserId = User.GetAuthUserId();
            if (authUserId == null) return null;

            var auth = await _db.AuthUsers.AsNoTracking().FirstOrDefaultAsync(a => a.Id == authUserId.Value);
            return auth?.UserId;
        }

        private async Task<(int? Id, string Name)> ResolvePerformerAsync(CancellationToken ct)
        {
            var userId = await ResolveProfileUserIdAsync();
            if (userId == null) return (null, "System");

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
            var name = user == null ? "User" : $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(name)) name = $"User #{userId}";
            return (userId, name);
        }
    }
}

