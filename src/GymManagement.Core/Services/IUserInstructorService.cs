using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserInstructorService
    {
        Task<IEnumerable<UserInstructorDto>> GetAllAssignmentsAsync();
        Task<IEnumerable<UserInstructorDto>> GetAssignmentsByUserIdAsync(int userId);
        Task<IEnumerable<UserInstructorDto>> GetAssignmentsByTrainerIdAsync(int trainerId);
        Task<IReadOnlyList<TrainerAssignedClientDto>> GetTrainerAssignedClientsAsync(int trainerId);
        Task<UserInstructorDto?> GetAssignmentByIdAsync(int id);
        Task<UserInstructorDto> CreateAssignmentAsync(CreateUserInstructorDto createDto);

        /// <summary>Ends other active assignments and assigns the member to <paramref name="trainerId"/>, or clears all assignments when null or ≤ 0.</summary>
        Task AssignOrReplaceMemberTrainerAsync(int userId, int? trainerId, CancellationToken cancellationToken = default);
        Task<UserInstructorDto?> UpdateAssignmentAsync(int id, UpdateUserInstructorDto updateDto);
        Task<bool> DeleteAssignmentAsync(int id);
        Task<IEnumerable<TrainerAssignmentRecommendationDto>> GetRecommendationsAsync(int userId);
    }
}

