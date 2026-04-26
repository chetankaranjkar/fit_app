namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// A meal within a diet plan (e.g. Breakfast, Lunch, Dinner). Order by MealOrder.
    /// </summary>
    public class DietMeal
    {
        public int Id { get; set; }
        public int DietPlanId { get; set; }
        public string MealName { get; set; } = string.Empty; // Breakfast, Lunch, Dinner
        public int MealOrder { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DietPlan DietPlan { get; set; } = null!;
        public ICollection<DietMealItem> DietMealItems { get; set; } = new List<DietMealItem>();
    }
}
