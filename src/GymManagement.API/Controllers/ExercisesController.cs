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
    public class ExercisesController : ControllerBase
    {
        private readonly IExerciseService _exerciseService;

        public ExercisesController(IExerciseService exerciseService)
        {
            _exerciseService = exerciseService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExerciseDto>>> GetAllExercises()
        {
            var exercises = await _exerciseService.GetAllExercisesAsync();
            return Ok(exercises);
        }

        [HttpGet("paged")]
        public async Task<ActionResult<PagedExercisesDto>> GetPagedExercises(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? difficulty = null,
            [FromQuery] int? bodyPartId = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = null
        )
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 100);
            var result = await _exerciseService.GetPagedExercisesAsync(
                safePage,
                safePageSize,
                search,
                difficulty,
                bodyPartId,
                sortBy,
                sortDir
            );
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ExerciseDto>> GetExercise(int id)
        {
            var exercise = await _exerciseService.GetExerciseByIdAsync(id);
            if (exercise == null)
                return NotFound();
            return Ok(exercise);
        }

        [HttpGet("bodypart/{bodyPartId}")]
        public async Task<ActionResult<IEnumerable<ExerciseDto>>> GetExercisesByBodyPart(int bodyPartId)
        {
            var exercises = await _exerciseService.GetExercisesByBodyPartAsync(bodyPartId);
            return Ok(exercises);
        }

        [HttpPost]
        public async Task<ActionResult<ExerciseDto>> CreateExercise(CreateExerciseDto createExerciseDto)
        {
            var exercise = await _exerciseService.CreateExerciseAsync(createExerciseDto);
            return CreatedAtAction(nameof(GetExercise), new { id = exercise.Id }, exercise);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ExerciseDto>> UpdateExercise(int id, UpdateExerciseDto updateExerciseDto)
        {
            var exercise = await _exerciseService.UpdateExerciseAsync(id, updateExerciseDto);
            if (exercise == null)
                return NotFound();
            return Ok(exercise);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExercise(int id)
        {
            var result = await _exerciseService.DeleteExerciseAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}

