using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class UserSchedulesController : ControllerBase
    {
        private readonly IUserScheduleService _userScheduleService;
        private readonly ApplicationDbContext _db;

        public UserSchedulesController(IUserScheduleService userScheduleService, ApplicationDbContext db)
        {
            _userScheduleService = userScheduleService;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserScheduleDto>>> GetAllSchedules(CancellationToken cancellationToken)
        {
            var schedules = await _userScheduleService.GetAllSchedulesAsync();
            if (!UserDirectoryScope.ShouldApplyCoachFilter(HttpContext))
                return Ok(schedules);

            var trainerProfileId = await UserDirectoryScope.ResolveTrainerProfileIdAsync(HttpContext, _db, cancellationToken);
            if (!trainerProfileId.HasValue)
                return Ok(Array.Empty<UserScheduleDto>());

            var clientIds = (await _db.UserInstructors.AsNoTracking()
                .Where(ui => !ui.IsDeleted && ui.IsActive && !ui.EndDate.HasValue && ui.TrainerId == trainerProfileId.Value)
                .Select(ui => ui.UserId)
                .ToListAsync(cancellationToken)).ToHashSet();
            return Ok(schedules.Where(s => clientIds.Contains(s.UserId)).ToList());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserScheduleDto>> GetSchedule(int id, CancellationToken cancellationToken)
        {
            var schedule = await _userScheduleService.GetScheduleByIdAsync(id);
            if (schedule == null)
                return NotFound();
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, schedule.UserId, cancellationToken))
                return Forbid();
            return Ok(schedule);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserScheduleDto>>> GetSchedulesByUser(int userId, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, userId, cancellationToken))
                return Forbid();
            var schedules = await _userScheduleService.GetSchedulesByUserIdAsync(userId);
            return Ok(schedules);
        }

        [HttpPost]
        public async Task<ActionResult<UserScheduleDto>> CreateSchedule(CreateUserScheduleDto createScheduleDto)
        {
            var schedule = await _userScheduleService.CreateScheduleAsync(createScheduleDto);
            return CreatedAtAction(nameof(GetSchedule), new { id = schedule.Id }, schedule);
        }

        [HttpPost("assign-workout-plan")]
        public async Task<ActionResult<UserScheduleDto>> AssignWorkoutPlan(AssignWorkoutPlanDto assignWorkoutPlanDto)
        {
            var schedule = await _userScheduleService.AssignWorkoutPlanAsync(assignWorkoutPlanDto);
            return CreatedAtAction(nameof(GetSchedule), new { id = schedule.Id }, schedule);
        }

        [HttpPost("generate-default")]
        public async Task<IActionResult> GenerateDefaultSchedule(GenerateDefaultScheduleDto generateScheduleDto)
        {
            var result = await _userScheduleService.GenerateDefaultScheduleAsync(generateScheduleDto);
            if (!result)
                return BadRequest("Unable to generate default schedule. User may already have schedules or no workout plans available.");
            return Ok(new { message = "Default schedule generated successfully" });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSchedule(int id, CreateUserScheduleDto updateScheduleDto)
        {
            var result = await _userScheduleService.UpdateScheduleAsync(id, updateScheduleDto);
            if (!result)
                return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSchedule(int id)
        {
            var result = await _userScheduleService.DeleteScheduleAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}

