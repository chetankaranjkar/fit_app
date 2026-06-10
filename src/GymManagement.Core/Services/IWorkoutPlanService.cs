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
        Task<bool> DeleteWorkoutPlanAsync(int id, int? performedByUserId = null, string? performedByUserName = null, CancellationToken ct = default);
        Task<WorkoutPlanDto?> SaveProgramStructureAsync(
            int id,
            SaveProgramStructureDto dto,
            int? performedByUserId = null,
            string? performedByUserName = null,
            CancellationToken ct = default);
        Task<WorkoutPlanDto?> CloneWorkoutPlanAsync(int id, CloneWorkoutPlanDto dto);
        Task<WorkoutPlanDto?> SavePlanWarmupStretchAsync(
            int id,
            SavePlanWarmupStretchDto dto,
            int? performedByUserId = null,
            string? performedByUserName = null,
            CancellationToken ct = default);
        Task<(List<WorkoutPlanWarmupDto> Warmups, List<WorkoutPlanStretchDto> Stretches)> ResolveEffectiveMobilityAsync(WorkoutPlan plan);
    }
}

