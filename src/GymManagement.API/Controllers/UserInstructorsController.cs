using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public class UserInstructorsController : ControllerBase
    {
        private readonly IUserInstructorService _userInstructorService;
        private readonly ApplicationDbContext _db;

        public UserInstructorsController(IUserInstructorService userInstructorService, ApplicationDbContext db)
        {
            _userInstructorService = userInstructorService;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserInstructorDto>>> GetAllAssignments(CancellationToken cancellationToken)
        {
            if (UserDirectoryScope.ShouldApplyCoachFilter(HttpContext))
            {
                var trainerProfileId = await UserDirectoryScope.ResolveTrainerProfileIdAsync(HttpContext, _db, cancellationToken);
                return trainerProfileId.HasValue
                    ? Ok(await _userInstructorService.GetAssignmentsByTrainerIdAsync(trainerProfileId.Value))
                    : Ok(Array.Empty<UserInstructorDto>());
            }

            var assignments = await _userInstructorService.GetAllAssignmentsAsync();
            return Ok(assignments);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserInstructorDto>>> GetAssignmentsByUser(int userId, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, userId, cancellationToken))
                return Forbid();
            var assignments = await _userInstructorService.GetAssignmentsByUserIdAsync(userId);
            return Ok(assignments);
        }

        [HttpGet("trainer/{trainerId}")]
        public async Task<ActionResult<IEnumerable<UserInstructorDto>>> GetAssignmentsByTrainer(int trainerId, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessTrainerProfileAsync(HttpContext, _db, trainerId, cancellationToken))
                return Forbid();
            var assignments = await _userInstructorService.GetAssignmentsByTrainerIdAsync(trainerId);
            return Ok(assignments);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserInstructorDto>> GetAssignment(int id, CancellationToken cancellationToken)
        {
            var assignment = await _userInstructorService.GetAssignmentByIdAsync(id);
            if (assignment == null)
                return NotFound();
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, assignment.UserId, cancellationToken))
                return Forbid();
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
        public async Task<ActionResult<IEnumerable<TrainerAssignmentRecommendationDto>>> GetRecommendations(int userId, CancellationToken cancellationToken)
        {
            if (!await UserDirectoryScope.CanAccessMemberAsync(HttpContext, _db, userId, cancellationToken))
                return Forbid();
            var recommendations = await _userInstructorService.GetRecommendationsAsync(userId);
            return Ok(recommendations);
        }
    }
}

