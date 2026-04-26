namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Diet plan template (goal type, calories, macros). CreatedById + CreatorType indicate Admin or Trainer.
    /// </summary>
    public class DietPlan : BaseEntity
    {
        public string PlanName { get; set; } = string.Empty;
        public string GoalType { get; set; } = string.Empty; // MuscleGain, FatLoss, Maintenance
        public int Calories { get; set; }
        public int? ProteinGrams { get; set; }
        public int? CarbsGrams { get; set; }
        public int? FatsGrams { get; set; }
        public string? Description { get; set; }
        public int? CreatedById { get; set; }
        public string? CreatorType { get; set; } // Admin, Trainer
        public bool IsActive { get; set; } = true;
        public int? OrganizationId { get; set; }

        public Organization? Organization { get; set; }
        public ICollection<UserDietPlan> UserDietPlans { get; set; } = new List<UserDietPlan>();
        public ICollection<DietMeal> DietMeals { get; set; } = new List<DietMeal>();
    }
}
