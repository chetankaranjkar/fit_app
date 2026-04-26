namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// A muscle under a body part (e.g. Upper Chest under Chest, Deltoid under Shoulders).
    /// </summary>
    public class BodyPartMuscle : BaseEntity
    {
        public int BodyPartId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }

        public BodyPart BodyPart { get; set; } = null!;
    }
}
