using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class PTPackage : BaseEntity
    {
        [Required]
        [MaxLength(150)]
        public string PackageName { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        public PTPackageType PackageType { get; set; } = PTPackageType.SessionBased;

        public int TotalSessions { get; set; }

        public int ValidityDays { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal TaxPercentage { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal DefaultDiscountAmount { get; set; }

        public bool IsActive { get; set; } = true;

        public int? OrganizationId { get; set; }

        public Organization? Organization { get; set; }
        public ICollection<PTPackagePrice> TrainerPrices { get; set; } = new List<PTPackagePrice>();
        public ICollection<MemberPTPackage> MemberPackages { get; set; } = new List<MemberPTPackage>();
    }
}
