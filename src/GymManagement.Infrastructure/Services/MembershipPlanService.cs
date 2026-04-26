using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class MembershipPlanService : IMembershipPlanService
    {
        private readonly IUnitOfWork _unitOfWork;

        public MembershipPlanService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<MembershipPlanDto>> GetAllAsync()
        {
            var plans = await _unitOfWork.MembershipPlans.GetAllAsync();
            return plans.Select(MapToDto);
        }

        public async Task<MembershipPlanDto?> GetByIdAsync(int id)
        {
            var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(id);
            return plan == null ? null : MapToDto(plan);
        }

        public async Task<MembershipPlanDto> CreateAsync(CreateMembershipPlanDto dto)
        {
            var plan = new MembershipPlan
            {
                PlanName = dto.PlanName,
                DurationDays = dto.DurationDays,
                Price = dto.Price,
                Description = dto.Description
            };
            await _unitOfWork.MembershipPlans.AddAsync(plan);
            await _unitOfWork.SaveChangesAsync();
            return MapToDto(plan);
        }

        public async Task<MembershipPlanDto?> UpdateAsync(int id, UpdateMembershipPlanDto dto)
        {
            var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(id);
            if (plan == null) return null;

            if (!string.IsNullOrEmpty(dto.PlanName)) plan.PlanName = dto.PlanName;
            if (dto.DurationDays.HasValue) plan.DurationDays = dto.DurationDays.Value;
            if (dto.Price.HasValue) plan.Price = dto.Price.Value;
            if (dto.Description != null) plan.Description = dto.Description;

            _unitOfWork.MembershipPlans.Update(plan);
            await _unitOfWork.SaveChangesAsync();
            return MapToDto(plan);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(id);
            if (plan == null) return false;
            _unitOfWork.MembershipPlans.Delete(plan);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static MembershipPlanDto MapToDto(MembershipPlan p) => new()
        {
            Id = p.Id,
            PlanName = p.PlanName,
            DurationDays = p.DurationDays,
            Price = p.Price,
            Description = p.Description
        };
    }
}
