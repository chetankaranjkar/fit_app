using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    public interface IWorkoutPlanService
    {
        Task<IEnumerable<WorkoutPlanDto>> GetAllWorkoutPlansAsync();
        Task<WorkoutPlanDto?> GetWorkoutPlanByIdAsync(int id);
        Task<IEnumerable<WorkoutPlanDto>> GetWorkoutPlansByTypeAsync(WorkoutType workoutType);
        Task<WorkoutPlanDto> CreateWorkoutPlanAsync(CreateWorkoutPlanDto createWorkoutPlanDto);
        Task<WorkoutPlanDto?> UpdateWorkoutPlanAsync(int id, CreateWorkoutPlanDto updateWorkoutPlanDto);
        Task<bool> DeleteWorkoutPlanAsync(int id);
    }
}

