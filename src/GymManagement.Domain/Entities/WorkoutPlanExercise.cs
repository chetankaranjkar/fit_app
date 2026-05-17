namespace GymManagement.Domain.Entities
{
    public class WorkoutPlanExercise : BaseEntity
    {
        public int WorkoutPlanId { get; set; }
        public int? WorkoutPlanDayId { get; set; }
        public int ExerciseId { get; set; }
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestBetweenSets { get; set; } // in seconds
        public int Order { get; set; }
        public decimal? Weight { get; set; } // Optional weight for the exercise
        public string? Tempo { get; set; }
        public string? Intensity { get; set; }
        public string? Notes { get; set; }

        // Navigation properties
        public WorkoutPlan WorkoutPlan { get; set; } = null!;
        public WorkoutPlanDay? WorkoutPlanDay { get; set; }
        public Exercise Exercise { get; set; } = null!;
    }
}
