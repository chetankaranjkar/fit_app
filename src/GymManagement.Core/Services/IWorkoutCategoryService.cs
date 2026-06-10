using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IWorkoutCategoryService
{
    Task<IReadOnlyList<WorkoutCategorySummaryDto>> GetAllAsync();
    Task<WorkoutCategoryDto?> GetByIdAsync(int id);
    Task<WorkoutCategoryDto> CreateAsync(CreateWorkoutCategoryDto dto, int performedByUserId, string performedByUserName);
    Task<WorkoutCategoryDto?> UpdateAsync(int id, UpdateWorkoutCategoryDto dto, int performedByUserId, string performedByUserName);
    Task<bool> DeleteAsync(int id, int performedByUserId, string performedByUserName);
    Task<WorkoutCategoryDto?> SaveWarmupStretchAsync(
        int id,
        SaveCategoryWarmupStretchDto dto,
        int performedByUserId,
        string performedByUserName);
    Task<(List<WorkoutPlanWarmupDto> Warmups, List<WorkoutPlanStretchDto> Stretches)> GetDefaultsAsPlanDtosAsync(int categoryId);
}
