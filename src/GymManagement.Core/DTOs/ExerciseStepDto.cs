namespace GymManagement.Core.DTOs
{
    public class ExerciseStepDto
    {
        public int Id { get; set; }
        public int StepNumber { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
    }

    public class CreateExerciseStepDto
    {
        public int StepNumber { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
    }

    public class UpdateExerciseStepDto
    {
        public int? StepNumber { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }
}

