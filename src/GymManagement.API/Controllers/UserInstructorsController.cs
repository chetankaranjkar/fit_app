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
    public class UserInstructorsController : ControllerBase
    {
        private readonly IUserInstructorService _userInstructorService;

        public UserInstructorsController(IUserInstructorService userInstructorService)
        {
            _userInstructorService = userInstructorService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserInstructorDto>>> GetAllAssignments()
        {
            var assignments = await _userInstructorService.GetAllAssignmentsAsync();
            return Ok(assignments);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserInstructorDto>>> GetAssignmentsByUser(int userId)
        {
            var assignments = await _userInstructorService.GetAssignmentsByUserIdAsync(userId);
            return Ok(assignments);
        }

        [HttpGet("trainer/{trainerId}")]
        public async Task<ActionResult<IEnumerable<UserInstructorDto>>> GetAssignmentsByTrainer(int trainerId)
        {
            var assignments = await _userInstructorService.GetAssignmentsByTrainerIdAsync(trainerId);
            return Ok(assignments);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserInstructorDto>> GetAssignment(int id)
        {
            var assignment = await _userInstructorService.GetAssignmentByIdAsync(id);
            if (assignment == null)
                return NotFound();
            return Ok(assignment);
        }

        [HttpPost]
        public async Task<ActionResult<UserInstructorDto>> CreateAssignment(CreateUserInstructorDto createDto)
        {
            var assignment = await _userInstructorService.CreateAssignmentAsync(createDto);
            return CreatedAtAction(nameof(GetAssignment), new { id = assignment.Id }, assignment);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<UserInstructorDto>> UpdateAssignment(int id, UpdateUserInstructorDto updateDto)
        {
            var assignment = await _userInstructorService.UpdateAssignmentAsync(id, updateDto);
            if (assignment == null)
                return NotFound();
            return Ok(assignment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAssignment(int id)
        {
            var result = await _userInstructorService.DeleteAssignmentAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }

        [HttpGet("recommendations/{userId}")]
        public async Task<ActionResult<IEnumerable<TrainerAssignmentRecommendationDto>>> GetRecommendations(int userId)
        {
            var recommendations = await _userInstructorService.GetRecommendationsAsync(userId);
            return Ok(recommendations);
        }
    }
}

