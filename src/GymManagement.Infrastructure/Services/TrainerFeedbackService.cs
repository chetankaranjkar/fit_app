using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class TrainerFeedbackService : ITrainerFeedbackService
    {
        private readonly IUnitOfWork _unitOfWork;

        public TrainerFeedbackService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<TrainerFeedbackDto>> GetAllFeedbacksAsync()
        {
            var feedbacks = await _unitOfWork.TrainerFeedbacks.GetAllAsync();
            return await MapFeedbacksToDtoAsync(feedbacks);
        }

        public async Task<IEnumerable<TrainerFeedbackDto>> GetFeedbacksByTrainerIdAsync(int trainerId)
        {
            var feedbacks = await _unitOfWork.TrainerFeedbacks.FindAsync(f => f.TrainerId == trainerId);
            return await MapFeedbacksToDtoAsync(feedbacks);
        }

        public async Task<IEnumerable<TrainerFeedbackDto>> GetFeedbacksByUserIdAsync(int userId)
        {
            var feedbacks = await _unitOfWork.TrainerFeedbacks.FindAsync(f => f.UserId == userId);
            return await MapFeedbacksToDtoAsync(feedbacks);
        }

        public async Task<TrainerFeedbackDto?> GetFeedbackByIdAsync(int id)
        {
            var feedback = await _unitOfWork.TrainerFeedbacks.GetByIdAsync(id);
            if (feedback == null) return null;

            var feedbacks = new[] { feedback };
            var dtos = await MapFeedbacksToDtoAsync(feedbacks);
            return dtos.FirstOrDefault();
        }

        public async Task<TrainerFeedbackDto> CreateFeedbackAsync(CreateTrainerFeedbackDto createDto)
        {
            if (createDto.Rating < 1 || createDto.Rating > 5)
                throw new BadRequestException("Rating must be between 1 and 5.");

            var feedback = new TrainerFeedback
            {
                TrainerId = createDto.TrainerId,
                UserId = createDto.UserId,
                Rating = createDto.Rating,
                Feedback = createDto.Feedback,
                Comments = createDto.Comments,
                FeedbackDate = DateTime.UtcNow
            };

            await _unitOfWork.TrainerFeedbacks.AddAsync(feedback);
            await _unitOfWork.SaveChangesAsync();

            var feedbacks = new[] { feedback };
            var dtos = await MapFeedbacksToDtoAsync(feedbacks);
            return dtos.First();
        }

        public async Task<TrainerFeedbackDto?> UpdateFeedbackAsync(int id, UpdateTrainerFeedbackDto updateDto)
        {
            var feedback = await _unitOfWork.TrainerFeedbacks.GetByIdAsync(id);
            if (feedback == null) return null;

            if (updateDto.Rating.HasValue)
            {
                if (updateDto.Rating.Value < 1 || updateDto.Rating.Value > 5)
                    throw new BadRequestException("Rating must be between 1 and 5.");
                feedback.Rating = updateDto.Rating.Value;
            }
            if (updateDto.Feedback != null)
                feedback.Feedback = updateDto.Feedback;
            if (updateDto.Comments != null)
                feedback.Comments = updateDto.Comments;

            _unitOfWork.TrainerFeedbacks.Update(feedback);
            await _unitOfWork.SaveChangesAsync();

            var feedbacks = new[] { feedback };
            var dtos = await MapFeedbacksToDtoAsync(feedbacks);
            return dtos.First();
        }

        public async Task<bool> DeleteFeedbackAsync(int id)
        {
            var feedback = await _unitOfWork.TrainerFeedbacks.GetByIdAsync(id);
            if (feedback == null) return false;

            _unitOfWork.TrainerFeedbacks.Delete(feedback);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<decimal> GetAverageRatingAsync(int trainerId)
        {
            var feedbacks = await _unitOfWork.TrainerFeedbacks.FindAsync(f => f.TrainerId == trainerId);
            if (!feedbacks.Any()) return 0;

            return feedbacks.Average(f => (decimal)f.Rating);
        }

        private async Task<IEnumerable<TrainerFeedbackDto>> MapFeedbacksToDtoAsync(IEnumerable<TrainerFeedback> feedbacks)
        {
            var feedbackList = feedbacks.ToList();
            var userIds = feedbackList.Select(f => f.UserId).Distinct().ToList();
            var trainerIds = feedbackList.Select(f => f.TrainerId).Distinct().ToList();

            var users = await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id));
            var trainers = await _unitOfWork.Trainers.FindAsync(i => trainerIds.Contains(i.Id));
            var trainerUserIds = trainers.Select(i => i.UserId).Distinct().ToList();
            var trainerUsers = trainerUserIds.Count > 0
                ? await _unitOfWork.Users.FindAsync(u => trainerUserIds.Contains(u.Id))
                : new List<User>();
            var trainerUserDict = trainerUsers.ToDictionary(u => u.Id);
            var userDict = users.ToDictionary(u => u.Id);
            var trainerDict = trainers.ToDictionary(i => i.Id);

            return feedbackList.Select(f => new TrainerFeedbackDto
            {
                Id = f.Id,
                TrainerId = f.TrainerId,
                TrainerName = trainerDict.ContainsKey(f.TrainerId) && trainerUserDict.ContainsKey(trainerDict[f.TrainerId].UserId)
                    ? $"{trainerUserDict[trainerDict[f.TrainerId].UserId].FirstName} {trainerUserDict[trainerDict[f.TrainerId].UserId].LastName}"
                    : "Unknown",
                UserId = f.UserId,
                UserName = userDict.ContainsKey(f.UserId)
                    ? $"{userDict[f.UserId].FirstName} {userDict[f.UserId].LastName}"
                    : "Unknown",
                Rating = f.Rating,
                Feedback = f.Feedback,
                Comments = f.Comments,
                FeedbackDate = f.FeedbackDate
            });
        }
    }
}
