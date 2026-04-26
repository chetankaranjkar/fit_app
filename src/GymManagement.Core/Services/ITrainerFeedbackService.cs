using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface ITrainerFeedbackService
    {
        Task<IEnumerable<TrainerFeedbackDto>> GetAllFeedbacksAsync();
        Task<IEnumerable<TrainerFeedbackDto>> GetFeedbacksByTrainerIdAsync(int trainerId);
        Task<IEnumerable<TrainerFeedbackDto>> GetFeedbacksByUserIdAsync(int userId);
        Task<TrainerFeedbackDto?> GetFeedbackByIdAsync(int id);
        Task<TrainerFeedbackDto> CreateFeedbackAsync(CreateTrainerFeedbackDto createDto);
        Task<TrainerFeedbackDto?> UpdateFeedbackAsync(int id, UpdateTrainerFeedbackDto updateDto);
        Task<bool> DeleteFeedbackAsync(int id);
        Task<decimal> GetAverageRatingAsync(int trainerId);
    }
}
