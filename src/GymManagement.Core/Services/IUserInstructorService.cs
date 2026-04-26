using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserInstructorService
    {
        Task<IEnumerable<UserInstructorDto>> GetAllAssignmentsAsync();
        Task<IEnumerable<UserInstructorDto>> GetAssignmentsByUserIdAsync(int userId);
        Task<IEnumerable<UserInstructorDto>> GetAssignmentsByTrainerIdAsync(int trainerId);
        Task<UserInstructorDto?> GetAssignmentByIdAsync(int id);
        Task<UserInstructorDto> CreateAssignmentAsync(CreateUserInstructorDto createDto);
        Task<UserInstructorDto?> UpdateAssignmentAsync(int id, UpdateUserInstructorDto updateDto);
        Task<bool> DeleteAssignmentAsync(int id);
        Task<IEnumerable<TrainerAssignmentRecommendationDto>> GetRecommendationsAsync(int userId);
    }
}

