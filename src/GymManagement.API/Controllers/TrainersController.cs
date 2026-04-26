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
    public class TrainersController : ControllerBase
    {
        private readonly ITrainerService _trainerService;

        public TrainersController(ITrainerService trainerService)
        {
            _trainerService = trainerService;
        }

        [HttpGet("stats")]
        public async Task<ActionResult<TrainerStatsDto>> GetTrainerStats()
        {
            var stats = await _trainerService.GetTrainerStatsAsync();
            return Ok(stats);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TrainerDto>>> GetAllTrainers()
        {
            var trainers = await _trainerService.GetAllTrainersAsync();
            return Ok(trainers);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TrainerDto>> GetTrainer(int id)
        {
            var trainer = await _trainerService.GetTrainerByIdAsync(id);
            if (trainer == null)
                return NotFound();
            return Ok(trainer);
        }

        [HttpPost]
        public async Task<ActionResult<TrainerDto>> CreateTrainer(CreateTrainerDto createTrainerDto)
        {
            var trainer = await _trainerService.CreateTrainerAsync(createTrainerDto);
            return CreatedAtAction(nameof(GetTrainer), new { id = trainer.Id }, trainer);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TrainerDto>> UpdateTrainer(int id, UpdateTrainerDto updateTrainerDto)
        {
            var trainer = await _trainerService.UpdateTrainerAsync(id, updateTrainerDto);
            if (trainer == null)
                return NotFound();
            return Ok(trainer);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTrainer(int id)
        {
            var result = await _trainerService.DeleteTrainerAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}
