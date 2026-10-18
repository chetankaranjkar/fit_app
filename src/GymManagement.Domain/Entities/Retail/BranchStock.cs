using GymManagement.Domain.Entities;

namespace GymManagement.Domain.Entities.Retail;

/// <summary>On-hand stock for one catalog product at one branch. The product definition stays organization-wide.</summary>
public class BranchStock : BaseEntity
{
    public int ProductId { get; set; }
    public int BranchId { get; set; }
    public int Quantity { get; set; }
    public int ReorderLevel { get; set; }

    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
