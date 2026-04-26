namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// A specialization (e.g. "Strength", "Yoga") for an instructor/trainer.
    /// </summary>
    public class TrainerSpecialization : BaseEntity
    {
        public int TrainerId { get; set; }
        public string SpecializationName { get; set; } = string.Empty;

        public Trainer Trainer { get; set; } = null!;
    }
}
