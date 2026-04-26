namespace GymManagement.Domain.Entities
{
    public class Exercise : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Steps { get; set; } = string.Empty; // Mandatory
        public string? VideoUrl { get; set; } // Optional
        public string DifficultyLevel { get; set; } = "Beginner"; // Beginner, Intermediate, Advanced
        public string? EquipmentRequired { get; set; }
        public int BodyPartId { get; set; }

        // Navigation properties
        public BodyPart BodyPart { get; set; } = null!;
        public ICollection<WorkoutPlanExercise> WorkoutPlanExercises { get; set; } = new List<WorkoutPlanExercise>();
        public ICollection<ExerciseStep> ExerciseSteps { get; set; } = new List<ExerciseStep>();
        public ICollection<WorkoutLog> WorkoutLogs { get; set; } = new List<WorkoutLog>();
        public ICollection<PersonalRecord> PersonalRecords { get; set; } = new List<PersonalRecord>();
    }
}
