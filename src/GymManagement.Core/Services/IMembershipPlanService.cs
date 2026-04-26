using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IMembershipPlanService
    {
        Task<IEnumerable<MembershipPlanDto>> GetAllAsync();
        Task<MembershipPlanDto?> GetByIdAsync(int id);
        Task<MembershipPlanDto> CreateAsync(CreateMembershipPlanDto dto);
        Task<MembershipPlanDto?> UpdateAsync(int id, UpdateMembershipPlanDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
