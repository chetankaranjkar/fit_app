namespace GymManagement.Domain.Entities
{
    /// <summary>GoalType: WeightLoss, MuscleGain. Status: Active, Completed.</summary>
    public class UserGoal
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string GoalType { get; set; } = string.Empty;
        public decimal TargetValue { get; set; }
        public decimal? CurrentValue { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? TargetDate { get; set; }
        public string Status { get; set; } = string.Empty;

        public User User { get; set; } = null!;
    }
}
