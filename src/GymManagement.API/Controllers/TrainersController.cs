using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
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
        private readonly IUserInstructorService _userInstructorService;

        public TrainersController(ITrainerService trainerService, IUserInstructorService userInstructorService)
        {
            _trainerService = trainerService;
            _userInstructorService = userInstructorService;
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
            try
            {
                var trainer = await _trainerService.CreateTrainerAsync(createTrainerDto);
                return CreatedAtAction(nameof(GetTrainer), new { id = trainer.Id }, trainer);
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
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

        [HttpGet("{id}/clients")]
        public async Task<ActionResult<IEnumerable<TrainerAssignedClientDto>>> GetAssignedClients(int id)
        {
            if (await _trainerService.GetTrainerByIdAsync(id) == null)
                return NotFound();

            var clients = await _userInstructorService.GetTrainerAssignedClientsAsync(id);
            return Ok(clients);
        }

        [HttpPost("{id}/clients")]
        public async Task<ActionResult<UserInstructorDto>> AssignClient(int id, [FromBody] AssignTrainerClientRequest request)
        {
            if (request.UserId <= 0)
                return BadRequest(new { message = "userId is required." });

            if (await _trainerService.GetTrainerByIdAsync(id) == null)
                return NotFound();

            try
            {
                await _userInstructorService.AssignOrReplaceMemberTrainerAsync(request.UserId, id);
                var list = await _userInstructorService.GetAssignmentsByUserIdAsync(request.UserId);
                var created = list.FirstOrDefault(a => a.TrainerId == id && a.IsActive);
                return created == null ? Ok() : Ok(created);
            }
            catch (ConflictException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}/clients/{userId}")]
        public async Task<IActionResult> UnassignClient(int id, int userId)
        {
            var assignments = await _userInstructorService.GetAssignmentsByUserIdAsync(userId);
            var match = assignments.FirstOrDefault(a => a.TrainerId == id && a.IsActive && !a.EndDate.HasValue);
            if (match == null)
                return NotFound();

            await _userInstructorService.AssignOrReplaceMemberTrainerAsync(userId, null);
            return NoContent();
        }
    }
}
