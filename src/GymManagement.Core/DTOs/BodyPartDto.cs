namespace GymManagement.Core.DTOs
{
    public class BodyPartDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public int ExerciseCount { get; set; }
        public List<BodyPartMuscleDto> BodyPartMuscles { get; set; } = new();
        public string? CameraPositionJson { get; set; }
    }

    public class CreateBodyPartDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? CameraPositionJson { get; set; }
    }

    public class UpdateBodyPartDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class UpdateBodyPartCameraPositionDto
    {
        public string CameraPositionJson { get; set; } = string.Empty;
    }
}

