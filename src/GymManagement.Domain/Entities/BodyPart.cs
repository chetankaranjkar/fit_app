namespace GymManagement.Domain.Entities
{
    public class BodyPart : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }

        // 3D Model Camera Position (stored as JSON)
        public string? CameraPositionJson { get; set; }

        public ICollection<BodyPartMuscle> BodyPartMuscles { get; set; } = new List<BodyPartMuscle>();
        public ICollection<Exercise> Exercises { get; set; } = new List<Exercise>();
    }
}
