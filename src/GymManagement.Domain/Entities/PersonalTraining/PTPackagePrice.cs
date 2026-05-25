using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    /// <summary>Optional trainer-specific override price for a package.</summary>
    public class PTPackagePrice : BaseEntity
    {
        public int PackageId { get; set; }
        public int TrainerId { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal Price { get; set; }

        public bool IsActive { get; set; } = true;

        public PTPackage Package { get; set; } = null!;
        public Trainer Trainer { get; set; } = null!;
    }
}
