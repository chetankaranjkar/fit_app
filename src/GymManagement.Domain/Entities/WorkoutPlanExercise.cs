namespace GymManagement.Domain.Entities
{
    public class WorkoutPlanExercise : BaseEntity
    {
        public int WorkoutPlanId { get; set; }
        public int ExerciseId { get; set; }
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestBetweenSets { get; set; } // in seconds
        public int Order { get; set; }
        public decimal? Weight { get; set; } // Optional weight for the exercise

        // Navigation properties
        public WorkoutPlan WorkoutPlan { get; set; } = null!;
        public Exercise Exercise { get; set; } = null!;
    }
}
