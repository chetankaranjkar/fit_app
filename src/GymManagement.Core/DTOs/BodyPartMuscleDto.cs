namespace GymManagement.Core.DTOs
{
    public class BodyPartMuscleDto
    {
        public int Id { get; set; }
        public int BodyPartId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class CreateBodyPartMuscleDto
    {
        public int BodyPartId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class UpdateBodyPartMuscleDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }
}
