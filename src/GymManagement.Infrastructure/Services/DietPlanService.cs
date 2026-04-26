using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.Infrastructure.Services
{
    public class DietPlanService : IDietPlanService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;

        public DietPlanService(IUnitOfWork unitOfWork, ApplicationDbContext context)
        {
            _unitOfWork = unitOfWork;
            _context = context;
        }

        public async Task<IEnumerable<DietPlanDto>> GetAllAsync()
        {
            var plans = await _unitOfWork.DietPlans.GetAllAsync();
            return plans.Select(MapPlanToDto);
        }

        public async Task<DietPlanDto?> GetByIdAsync(int id)
        {
            var plan = await _context.DietPlans
                .Include(p => p.DietMeals.OrderBy(m => m.MealOrder))
                .ThenInclude(m => m.DietMealItems)
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            return plan == null ? null : MapPlanToDtoWithMeals(plan);
        }

        public async Task<DietPlanDto> CreateAsync(CreateDietPlanDto dto)
        {
            var plan = new DietPlan
            {
                PlanName = dto.PlanName,
                GoalType = dto.GoalType,
                Calories = dto.Calories,
                ProteinGrams = dto.ProteinGrams,
                CarbsGrams = dto.CarbsGrams,
                FatsGrams = dto.FatsGrams,
                Description = dto.Description,
                IsActive = dto.IsActive,
            };
            await _unitOfWork.DietPlans.AddAsync(plan);
            await _unitOfWork.SaveChangesAsync();
            return MapPlanToDto(plan);
        }

        public async Task<DietPlanDto?> UpdateAsync(int id, UpdateDietPlanDto dto)
        {
            var plan = await _unitOfWork.DietPlans.GetByIdAsync(id);
            if (plan == null) return null;

            if (!string.IsNullOrEmpty(dto.PlanName)) plan.PlanName = dto.PlanName;
            if (!string.IsNullOrEmpty(dto.GoalType)) plan.GoalType = dto.GoalType;
            if (dto.Calories.HasValue) plan.Calories = dto.Calories.Value;
            if (dto.ProteinGrams != null) plan.ProteinGrams = dto.ProteinGrams;
            if (dto.CarbsGrams != null) plan.CarbsGrams = dto.CarbsGrams;
            if (dto.FatsGrams != null) plan.FatsGrams = dto.FatsGrams;
            if (dto.Description != null) plan.Description = dto.Description;
            if (dto.IsActive.HasValue) plan.IsActive = dto.IsActive.Value;

            _unitOfWork.DietPlans.Update(plan);
            await _unitOfWork.SaveChangesAsync();
            return MapPlanToDto(plan);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var plan = await _unitOfWork.DietPlans.GetByIdAsync(id);
            if (plan == null) return false;
            _unitOfWork.DietPlans.Delete(plan);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<DietMealDto> CreateMealAsync(CreateDietMealDto dto)
        {
            var meal = new DietMeal
            {
                DietPlanId = dto.DietPlanId,
                MealName = dto.MealName,
                MealOrder = dto.MealOrder,
            };
            _context.DietMeals.Add(meal);
            await _context.SaveChangesAsync();
            return MapMealToDto(meal);
        }

        public async Task<DietMealDto?> UpdateMealAsync(int id, UpdateDietMealDto dto)
        {
            var meal = await _context.DietMeals.FindAsync(id);
            if (meal == null) return null;
            if (!string.IsNullOrEmpty(dto.MealName)) meal.MealName = dto.MealName;
            if (dto.MealOrder.HasValue) meal.MealOrder = dto.MealOrder.Value;
            await _context.SaveChangesAsync();
            return MapMealToDto(meal);
        }

        public async Task<bool> DeleteMealAsync(int id)
        {
            var meal = await _context.DietMeals.FindAsync(id);
            if (meal == null) return false;
            _context.DietMeals.Remove(meal);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<DietMealItemDto> CreateMealItemAsync(CreateDietMealItemDto dto)
        {
            var item = new DietMealItem
            {
                DietMealId = dto.DietMealId,
                FoodName = dto.FoodName,
                Quantity = dto.Quantity,
                Calories = dto.Calories,
                ProteinGrams = dto.ProteinGrams,
                CarbsGrams = dto.CarbsGrams,
                FatsGrams = dto.FatsGrams,
            };
            _context.DietMealItems.Add(item);
            await _context.SaveChangesAsync();
            return MapItemToDto(item);
        }

        public async Task<DietMealItemDto?> UpdateMealItemAsync(int id, UpdateDietMealItemDto dto)
        {
            var item = await _context.DietMealItems.FindAsync(id);
            if (item == null) return null;
            if (!string.IsNullOrEmpty(dto.FoodName)) item.FoodName = dto.FoodName;
            if (!string.IsNullOrEmpty(dto.Quantity)) item.Quantity = dto.Quantity;
            if (dto.Calories != null) item.Calories = dto.Calories;
            if (dto.ProteinGrams != null) item.ProteinGrams = dto.ProteinGrams;
            if (dto.CarbsGrams != null) item.CarbsGrams = dto.CarbsGrams;
            if (dto.FatsGrams != null) item.FatsGrams = dto.FatsGrams;
            await _context.SaveChangesAsync();
            return MapItemToDto(item);
        }

        public async Task<bool> DeleteMealItemAsync(int id)
        {
            var item = await _context.DietMealItems.FindAsync(id);
            if (item == null) return false;
            _context.DietMealItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        private static DietPlanDto MapPlanToDto(DietPlan p) => new()
        {
            Id = p.Id,
            PlanName = p.PlanName,
            GoalType = p.GoalType,
            Calories = p.Calories,
            ProteinGrams = p.ProteinGrams,
            CarbsGrams = p.CarbsGrams,
            FatsGrams = p.FatsGrams,
            Description = p.Description,
            IsActive = p.IsActive,
        };

        private static DietPlanDto MapPlanToDtoWithMeals(DietPlan p)
        {
            var dto = MapPlanToDto(p);
            dto.DietMeals = p.DietMeals.Select(MapMealToDto).ToList();
            return dto;
        }

        private static DietMealDto MapMealToDto(DietMeal m)
        {
            var dto = new DietMealDto
            {
                Id = m.Id,
                DietPlanId = m.DietPlanId,
                MealName = m.MealName,
                MealOrder = m.MealOrder,
            };
            if (m.DietMealItems != null)
                dto.DietMealItems = m.DietMealItems.Select(MapItemToDto).ToList();
            return dto;
        }

        private static DietMealItemDto MapItemToDto(DietMealItem i) => new()
        {
            Id = i.Id,
            DietMealId = i.DietMealId,
            FoodName = i.FoodName,
            Quantity = i.Quantity,
            Calories = i.Calories,
            ProteinGrams = i.ProteinGrams,
            CarbsGrams = i.CarbsGrams,
            FatsGrams = i.FatsGrams,
        };
    }
}
