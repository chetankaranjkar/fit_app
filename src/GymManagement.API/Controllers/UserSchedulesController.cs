using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class UserSchedulesController : ControllerBase
    {
        private readonly IUserScheduleService _userScheduleService;

        public UserSchedulesController(IUserScheduleService userScheduleService)
        {
            _userScheduleService = userScheduleService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserScheduleDto>>> GetAllSchedules()
        {
            var schedules = await _userScheduleService.GetAllSchedulesAsync();
            return Ok(schedules);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserScheduleDto>> GetSchedule(int id)
        {
            var schedule = await _userScheduleService.GetScheduleByIdAsync(id);
            if (schedule == null)
                return NotFound();
            return Ok(schedule);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserScheduleDto>>> GetSchedulesByUser(int userId)
        {
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

