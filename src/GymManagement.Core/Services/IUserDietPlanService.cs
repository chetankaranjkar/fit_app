using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserDietPlanService
    {
        Task<IEnumerable<UserDietPlanDto>> GetAssignmentsAsync(int? userId = null, int? dietPlanId = null);
        Task<UserDietPlanDto?> GetByIdAsync(int id);
        Task<UserDietPlanDto> AssignAsync(CreateUserDietPlanDto dto);
        Task<bool> UnassignAsync(int id);
    }
}
