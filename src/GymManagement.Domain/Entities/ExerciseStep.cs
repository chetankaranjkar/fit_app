namespace GymManagement.Domain.Entities
{
    public class ExerciseStep : BaseEntity
    {
        public int ExerciseId { get; set; }
        public int StepNumber { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }

        // Navigation property
        public Exercise Exercise { get; set; } = null!;
    }
}

