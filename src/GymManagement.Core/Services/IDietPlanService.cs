using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;

namespace GymManagement.Core.Services
{
    public interface IDietPlanService
    {
        Task<IEnumerable<DietPlanDto>> GetAllAsync();
        Task<PagedResultDto<DietPlanDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            string? goalType = null,
            bool? isActive = null);
        Task<DietPlanStatsDto> GetStatsAsync();
        Task<DietPlanDto?> GetByIdAsync(int id);
        Task<DietPlanDto> CreateAsync(CreateDietPlanDto dto);
        Task<DietPlanDto?> UpdateAsync(int id, UpdateDietPlanDto dto);
        Task<bool> DeleteAsync(int id);

        Task<DietMealDto> CreateMealAsync(CreateDietMealDto dto);
        Task<DietMealDto?> UpdateMealAsync(int id, UpdateDietMealDto dto);
        Task<bool> DeleteMealAsync(int id);

        Task<DietMealItemDto> CreateMealItemAsync(CreateDietMealItemDto dto);
        Task<DietMealItemDto?> UpdateMealItemAsync(int id, UpdateDietMealItemDto dto);
        Task<bool> DeleteMealItemAsync(int id);
    }
}
