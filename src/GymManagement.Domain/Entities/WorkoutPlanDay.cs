namespace GymManagement.Domain.Entities
{
    public class WorkoutPlanDay : BaseEntity
    {
        public int WorkoutPlanId { get; set; }
        public int? WorkoutPlanWeekId { get; set; }
        public int DayNumber { get; set; } // 1-7 weekly template
        public string Name { get; set; } = string.Empty;
        public bool IsRestDay { get; set; }
        public int OrderIndex { get; set; }
        public string? FocusArea { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }

        // Navigation properties
        public WorkoutPlan WorkoutPlan { get; set; } = null!;
        public WorkoutPlanWeek? Week { get; set; }
        public ICollection<WorkoutPlanExercise> WorkoutPlanExercises { get; set; } = new List<WorkoutPlanExercise>();
    }
}
