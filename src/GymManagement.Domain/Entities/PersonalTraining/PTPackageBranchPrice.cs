using System.ComponentModel.DataAnnotations.Schema;
using GymManagement.Domain.Entities;

namespace GymManagement.Domain.Entities.PersonalTraining;

/// <summary>Branch availability and price for a shared PT package. Trainer overrides stay on <see cref="PTPackagePrice"/>.</summary>
public class PTPackageBranchPrice : BaseEntity
{
    public int PackageId { get; set; }
    public int BranchId { get; set; }

    [Column(TypeName = "decimal(12,2)")]
    public decimal Price { get; set; }

    public bool IsAvailable { get; set; } = true;

    public PTPackage Package { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
