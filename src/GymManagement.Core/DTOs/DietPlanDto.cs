namespace GymManagement.Core.DTOs
{
    public class DietMealItemDto
    {
        public int Id { get; set; }
        public int DietMealId { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string Quantity { get; set; } = string.Empty;
        public int? Calories { get; set; }
        public decimal? ProteinGrams { get; set; }
        public decimal? CarbsGrams { get; set; }
        public decimal? FatsGrams { get; set; }
    }

    public class CreateDietMealItemDto
    {
        public int DietMealId { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string Quantity { get; set; } = string.Empty;
        public int? Calories { get; set; }
        public decimal? ProteinGrams { get; set; }
        public decimal? CarbsGrams { get; set; }
        public decimal? FatsGrams { get; set; }
    }

    public class UpdateDietMealItemDto
    {
        public string? FoodName { get; set; }
        public string? Quantity { get; set; }
        public int? Calories { get; set; }
        public decimal? ProteinGrams { get; set; }
        public decimal? CarbsGrams { get; set; }
        public decimal? FatsGrams { get; set; }
    }

    public class DietMealDto
    {
        public int Id { get; set; }
        public int DietPlanId { get; set; }
        public string MealName { get; set; } = string.Empty;
        public int MealOrder { get; set; }
        public List<DietMealItemDto> DietMealItems { get; set; } = new();
    }

    public class CreateDietMealDto
    {
        public int DietPlanId { get; set; }
        public string MealName { get; set; } = string.Empty;
        public int MealOrder { get; set; }
    }

    public class UpdateDietMealDto
    {
        public string? MealName { get; set; }
        public int? MealOrder { get; set; }
    }

    public class DietPlanDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string GoalType { get; set; } = string.Empty;
        public int Calories { get; set; }
        public int? ProteinGrams { get; set; }
        public int? CarbsGrams { get; set; }
        public int? FatsGrams { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public List<DietMealDto> DietMeals { get; set; } = new();
    }

    public class CreateDietPlanDto
    {
        public string PlanName { get; set; } = string.Empty;
        public string GoalType { get; set; } = string.Empty;
        public int Calories { get; set; }
        public int? ProteinGrams { get; set; }
        public int? CarbsGrams { get; set; }
        public int? FatsGrams { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateDietPlanDto
    {
        public string? PlanName { get; set; }
        public string? GoalType { get; set; }
        public int? Calories { get; set; }
        public int? ProteinGrams { get; set; }
        public int? CarbsGrams { get; set; }
        public int? FatsGrams { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }

    /// <summary>Assignment of a diet plan to a user.</summary>
    public class UserDietPlanDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int DietPlanId { get; set; }
        public string? UserName { get; set; }
        public string? DietPlanName { get; set; }
        public int? AssignedByTrainerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateUserDietPlanDto
    {
        public int UserId { get; set; }
        public int DietPlanId { get; set; }
        public int? AssignedByTrainerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }
    }
}
