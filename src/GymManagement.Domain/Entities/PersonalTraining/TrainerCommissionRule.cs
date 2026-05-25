using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class TrainerCommissionRule : BaseEntity
    {
        public int TrainerId { get; set; }
        public TrainerCommissionType CommissionType { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? Percentage { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal? FixedAmount { get; set; }

        public int? PackageId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }

        public Trainer Trainer { get; set; } = null!;
        public PTPackage? Package { get; set; }
    }
}
