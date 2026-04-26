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
    public class TrainerFeedbacksController : ControllerBase
    {
        private readonly ITrainerFeedbackService _feedbackService;

        public TrainerFeedbacksController(ITrainerFeedbackService feedbackService)
        {
            _feedbackService = feedbackService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TrainerFeedbackDto>>> GetAllFeedbacks()
        {
            var feedbacks = await _feedbackService.GetAllFeedbacksAsync();
            return Ok(feedbacks);
        }

        [HttpGet("trainer/{trainerId}")]
        public async Task<ActionResult<IEnumerable<TrainerFeedbackDto>>> GetFeedbacksByTrainer(int trainerId)
        {
            var feedbacks = await _feedbackService.GetFeedbacksByTrainerIdAsync(trainerId);
            return Ok(feedbacks);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TrainerFeedbackDto>>> GetFeedbacksByUser(int userId)
        {
            var feedbacks = await _feedbackService.GetFeedbacksByUserIdAsync(userId);
            return Ok(feedbacks);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TrainerFeedbackDto>> GetFeedback(int id)
        {
            var feedback = await _feedbackService.GetFeedbackByIdAsync(id);
            if (feedback == null)
                return NotFound();
            return Ok(feedback);
        }

        [HttpGet("trainer/{trainerId}/average-rating")]
        public async Task<ActionResult<decimal>> GetAverageRating(int trainerId)
        {
            var averageRating = await _feedbackService.GetAverageRatingAsync(trainerId);
            return Ok(new { trainerId, averageRating });
        }

        [HttpPost]
        public async Task<ActionResult<TrainerFeedbackDto>> CreateFeedback(CreateTrainerFeedbackDto createDto)
        {
            var feedback = await _feedbackService.CreateFeedbackAsync(createDto);
            return CreatedAtAction(nameof(GetFeedback), new { id = feedback.Id }, feedback);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TrainerFeedbackDto>> UpdateFeedback(int id, UpdateTrainerFeedbackDto updateDto)
        {
            var feedback = await _feedbackService.UpdateFeedbackAsync(id, updateDto);
            if (feedback == null)
                return NotFound();
            return Ok(feedback);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFeedback(int id)
        {
            var result = await _feedbackService.DeleteFeedbackAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}
