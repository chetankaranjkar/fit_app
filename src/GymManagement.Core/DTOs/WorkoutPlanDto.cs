using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class WorkoutPlanDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public WorkoutType WorkoutType { get; set; }
        /// <summary>Average session length in minutes (legacy field).</summary>
        public int Duration { get; set; }
        public string DifficultyLevel { get; set; } = string.Empty;
        public int? TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public bool IsActive { get; set; }
        public int? CreatedById { get; set; }
        public CreatorType? CreatorType { get; set; }
        public string? CreatorName { get; set; }
        public bool IsPublic { get; set; }
        public string? Goal { get; set; }
        public int DurationDays { get; set; }
        public int WorkoutsPerWeek { get; set; }
        public string? Thumbnail { get; set; }
        public int? EstimatedCaloriesBurn { get; set; }
        public List<string> Tags { get; set; } = new();
        public string Status { get; set; } = "Active";
        /// <summary>Distinct members with an active schedule for this program.</summary>
        public int AssignedMembersCount { get; set; }
        /// <summary>Approximate completion rate from logged sessions (0–100).</summary>
        public int CompletionRatePercent { get; set; }
        public List<ProgramWeekDto> Weeks { get; set; } = new();
        public List<WorkoutPlanExerciseDto> Exercises { get; set; } = new();
    }

    public class ProgramWeekDto
    {
        public int Id { get; set; }
        public int WeekNumber { get; set; }
        public string? Name { get; set; }
        public List<ProgramDayDto> Days { get; set; } = new();
    }

    public class ProgramDayDto
    {
        public int Id { get; set; }
        public int WeekId { get; set; }
        public int DayNumber { get; set; }
        public string DayName { get; set; } = string.Empty;
        public string? FocusArea { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }
        public bool IsRestDay { get; set; }
        public int OrderIndex { get; set; }
        public List<WorkoutPlanExerciseDto> Exercises { get; set; } = new();
    }

    public class WorkoutPlanExerciseDto
    {
        public int Id { get; set; }
        public int ExerciseId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public string? VideoUrl { get; set; }
        public string? BodyPartName { get; set; }
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestBetweenSets { get; set; }
        public int Order { get; set; }
        public decimal? Weight { get; set; }
        public string? Tempo { get; set; }
        public string? Intensity { get; set; }
        public string? Notes { get; set; }
        public int? WorkoutPlanDayId { get; set; }
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
        public string? Goal { get; set; }
        public int DurationDays { get; set; } = 30;
        public int WorkoutsPerWeek { get; set; } = 3;
        public string? Thumbnail { get; set; }
        public int? EstimatedCaloriesBurn { get; set; }
        public List<string>? Tags { get; set; }
        public string Status { get; set; } = "Active";
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
        public string? Tempo { get; set; }
        public string? Intensity { get; set; }
        public string? Notes { get; set; }
    }

    public class SaveProgramStructureDto
    {
        public List<ProgramWeekWriteDto> Weeks { get; set; } = new();
    }

    public class ProgramWeekWriteDto
    {
        public int WeekNumber { get; set; }
        public string? Name { get; set; }
        public List<ProgramDayWriteDto> Days { get; set; } = new();
    }

    public class ProgramDayWriteDto
    {
        public int DayNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? FocusArea { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }
        public bool IsRestDay { get; set; }
        public int OrderIndex { get; set; }
        public List<ProgramExerciseWriteDto> Exercises { get; set; } = new();
    }

    public class ProgramExerciseWriteDto
    {
        public int ExerciseId { get; set; }
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestBetweenSets { get; set; }
        public int Order { get; set; }
        public decimal? Weight { get; set; }
        public string? Tempo { get; set; }
        public string? Intensity { get; set; }
        public string? Notes { get; set; }
    }

    public class CloneWorkoutPlanDto
    {
        public string? Name { get; set; }
    }
}
