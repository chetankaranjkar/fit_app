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
    public class WorkoutPlansController : ControllerBase
    {
        private readonly IWorkoutPlanService _workoutPlanService;

        public WorkoutPlansController(IWorkoutPlanService workoutPlanService)
        {
            _workoutPlanService = workoutPlanService;
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorkoutPlan(int id)
        {
            var result = await _workoutPlanService.DeleteWorkoutPlanAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}

