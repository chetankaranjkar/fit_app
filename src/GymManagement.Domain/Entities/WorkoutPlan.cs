namespace GymManagement.Domain.Entities
{
    public class WorkoutPlan : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public WorkoutType WorkoutType { get; set; }
        public int Duration { get; set; } // in minutes
        public string DifficultyLevel { get; set; } = "Beginner"; // Beginner, Intermediate, Advanced
        public int? TrainerId { get; set; }
        public bool IsActive { get; set; } = true;
        public int? CreatedById { get; set; }
        public CreatorType? CreatorType { get; set; }
        public bool IsPublic { get; set; } = false;
        public int? OrganizationId { get; set; }

        // Navigation properties
        public Trainer? Trainer { get; set; }
        public Organization? Organization { get; set; }
        public ICollection<WorkoutPlanExercise> WorkoutPlanExercises { get; set; } = new List<WorkoutPlanExercise>();
        public ICollection<UserSchedule> UserSchedules { get; set; } = new List<UserSchedule>();
    }
}
