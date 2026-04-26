namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Assignment of a diet plan to a user (optionally by a trainer).
    /// </summary>
    public class UserDietPlan : BaseEntity
    {
        public int UserId { get; set; }
        public int DietPlanId { get; set; }
        public int? AssignedByTrainerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }

        public User User { get; set; } = null!;
        public DietPlan DietPlan { get; set; } = null!;
        public Trainer? AssignedByTrainer { get; set; }
    }
}
