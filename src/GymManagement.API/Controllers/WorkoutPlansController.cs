using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Programs;
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

        /// <summary>
        /// Current members for this program: one row per user with an active schedule slot.
        /// Does not widen the users directory or coach-scoped schedule lists.
        /// </summary>
        [HttpGet("{id}/assigned-members")]
        public async Task<ActionResult<ProgramAssignedMembersDto>> GetAssignedMembers(
            int id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var entity = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (entity == null)
                return NotFound();
            if (!await CanAccessPlanAsync(entity))
                return Forbid();

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var slotRows = await (
                from s in _db.UserSchedules.AsNoTracking()
                join u in _db.Users.AsNoTracking() on s.UserId equals u.Id
                where s.WorkoutPlanId == id && s.IsActive
                select new
                {
                    s.UserId,
                    s.CreatedDate,
                    s.IsActive,
                    s.IsDeleted,
                    u.FirstName,
                    u.LastName,
                }).ToListAsync(cancellationToken);

            var userIds = slotRows.Select(s => s.UserId).Distinct().ToList();
            var coachRows = userIds.Count == 0
                ? new List<CoachRow>()
                : await (
                    from ui in _db.UserInstructors.AsNoTracking()
                    join t in _db.Trainers.AsNoTracking() on ui.TrainerId equals t.Id
                    join tu in _db.Users.AsNoTracking() on t.UserId equals tu.Id
                    where userIds.Contains(ui.UserId)
                    select new CoachRow
                    {
                        UserId = ui.UserId,
                        TrainerId = ui.TrainerId,
                        AssignmentDate = ui.AssignmentDate,
                        EndDate = ui.EndDate,
                        IsActive = ui.IsActive,
                        IsDeleted = ui.IsDeleted,
                        FirstName = tu.FirstName,
                        LastName = tu.LastName,
                    }).ToListAsync(cancellationToken);

            var hasFullUsersAccess = UserDirectoryScope.HasUsersAccess(HttpContext);
            int? callerTrainerId = null;
            if (!hasFullUsersAccess)
                callerTrainerId = await UserDirectoryScope.ResolveTrainerProfileIdAsync(HttpContext, _db, cancellationToken);

            var members = ProgramRoster.Build(
                slotRows.Select(s => new ProgramRosterSlot
                {
                    UserId = s.UserId,
                    MemberName = $"{s.FirstName} {s.LastName}".Trim(),
                    CreatedAt = s.CreatedDate,
                    IsActive = s.IsActive,
                    IsDeleted = s.IsDeleted,
                }),
                coachRows.Select(c => new ProgramRosterCoach
                {
                    UserId = c.UserId,
                    TrainerId = c.TrainerId,
                    CoachName = $"{c.FirstName} {c.LastName}".Trim(),
                    AssignmentDate = c.AssignmentDate,
                    EndDate = c.EndDate,
                    IsActive = c.IsActive,
                    IsDeleted = c.IsDeleted,
                }),
                hasFullUsersAccess,
                callerTrainerId);

            var total = members.Count;
            var totalPages = pageSize < 1 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
            var items = members.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Ok(new ProgramAssignedMembersDto
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                ProfileAccessLimited = !hasFullUsersAccess,
            });
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

        [HttpPut("{id}/warmup-stretch")]
        public async Task<ActionResult<WorkoutPlanDto>> SavePlanWarmupStretch(int id, SavePlanWarmupStretchDto dto, CancellationToken ct)
        {
            var entity = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (entity == null)
                return NotFound();
            if (!await CanAccessPlanAsync(entity))
                return Forbid();

            var (performerId, performerName) = await ResolvePerformerAsync(ct);
            var plan = await _workoutPlanService.SavePlanWarmupStretchAsync(
                id,
                dto,
                performerId,
                performerName,
                ct);
            if (plan == null) return NotFound();
            return Ok(plan);
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

        private sealed class CoachRow
        {
            public int UserId { get; set; }
            public int TrainerId { get; set; }
            public DateTime AssignmentDate { get; set; }
            public DateTime? EndDate { get; set; }
            public bool IsActive { get; set; }
            public bool IsDeleted { get; set; }
            public string? FirstName { get; set; }
            public string? LastName { get; set; }
        }
    }
}

