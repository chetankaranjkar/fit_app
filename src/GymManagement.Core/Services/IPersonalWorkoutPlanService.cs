using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IPersonalWorkoutPlanService
{
    Task<IReadOnlyList<WorkoutPlanDto>> ListForMemberAsync(int memberUserId, CancellationToken ct = default);
    Task<WorkoutPlanDto?> CreateForMemberAsync(
        int memberUserId,
        CreatePersonalWorkoutPlanDto dto,
        int performedByUserId,
        string performedByUserName,
        CancellationToken ct = default);
}
