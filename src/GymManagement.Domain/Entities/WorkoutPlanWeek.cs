namespace GymManagement.Domain.Entities
{
    /// <summary>Template week inside a program (mesocycle block).</summary>
    public class WorkoutPlanWeek : BaseEntity
    {
        public int WorkoutPlanId { get; set; }
        /// <summary>1-based week index within the program template.</summary>
        public int WeekNumber { get; set; }
        public string? Name { get; set; }

        public WorkoutPlan WorkoutPlan { get; set; } = null!;
        public ICollection<WorkoutPlanDay> Days { get; set; } = new List<WorkoutPlanDay>();
    }
}
