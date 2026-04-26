using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class WorkoutPlanDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public WorkoutType WorkoutType { get; set; }
        public int Duration { get; set; }
        public string DifficultyLevel { get; set; } = string.Empty;
        public int? TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public bool IsActive { get; set; }
        public int? CreatedById { get; set; }
        public CreatorType? CreatorType { get; set; }
        public string? CreatorName { get; set; }
        public bool IsPublic { get; set; }
        public List<WorkoutPlanExerciseDto> Exercises { get; set; } = new();
    }

    public class WorkoutPlanExerciseDto
    {
        public int Id { get; set; }
        public int ExerciseId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestBetweenSets { get; set; }
        public int Order { get; set; }
        public decimal? Weight { get; set; }
    }

    public class CreateWorkoutPlanDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public WorkoutType WorkoutType { get; set; }
        public int Duration { get; set; }
        public string DifficultyLevel { get; set; } = "Beginner";
        public int? TrainerId { get; set; }
        public int? CreatedById { get; set; }
        public CreatorType? CreatorType { get; set; }
        public bool IsPublic { get; set; } = false;
        public List<CreateWorkoutPlanExerciseDto> Exercises { get; set; } = new();
    }

    public class CreateWorkoutPlanExerciseDto
    {
        public int ExerciseId { get; set; }
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestBetweenSets { get; set; }
        public int Order { get; set; }
        public decimal? Weight { get; set; }
    }
}

