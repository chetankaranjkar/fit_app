namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// A single food item within a diet meal (name, quantity, macros).
    /// </summary>
    public class DietMealItem
    {
        public int Id { get; set; }
        public int DietMealId { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string Quantity { get; set; } = string.Empty; // 100g, 2 eggs
        public int? Calories { get; set; }
        public decimal? ProteinGrams { get; set; }
        public decimal? CarbsGrams { get; set; }
        public decimal? FatsGrams { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DietMeal DietMeal { get; set; } = null!;
    }
}
