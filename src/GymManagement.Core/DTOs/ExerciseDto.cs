using System.Collections.Generic;

namespace GymManagement.Core.DTOs
{
    public class ExerciseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Steps { get; set; } = string.Empty; // Kept for backward compatibility
        public string? VideoUrl { get; set; }
        public string DifficultyLevel { get; set; } = string.Empty;
        public string? EquipmentRequired { get; set; }
        public int BodyPartId { get; set; }
        public string BodyPartName { get; set; } = string.Empty;
        public List<ExerciseStepDto> ExerciseSteps { get; set; } = new List<ExerciseStepDto>();
    }

    public class CreateExerciseDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Steps { get; set; } = string.Empty; // Kept for backward compatibility
        public string? VideoUrl { get; set; }
        public string DifficultyLevel { get; set; } = "Beginner";
        public string? EquipmentRequired { get; set; }
        public int BodyPartId { get; set; }
        public List<CreateExerciseStepDto> ExerciseSteps { get; set; } = new List<CreateExerciseStepDto>();
    }

    public class UpdateExerciseDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Steps { get; set; } // Kept for backward compatibility
        public string? VideoUrl { get; set; }
        public string? DifficultyLevel { get; set; }
        public string? EquipmentRequired { get; set; }
        public int? BodyPartId { get; set; }
        public List<CreateExerciseStepDto>? ExerciseSteps { get; set; }
    }

    public class PagedExercisesDto
    {
        public List<ExerciseDto> Items { get; set; } = new List<ExerciseDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}

