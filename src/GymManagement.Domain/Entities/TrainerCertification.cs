namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// A certification held by an instructor/trainer.
    /// </summary>
    public class TrainerCertification : BaseEntity
    {
        public int TrainerId { get; set; }
        public string CertificateName { get; set; } = string.Empty;
        public string? IssuedBy { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }

        public Trainer Trainer { get; set; } = null!;
    }
}
