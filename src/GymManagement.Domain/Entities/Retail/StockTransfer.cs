using GymManagement.Domain.Entities;

namespace GymManagement.Domain.Entities.Retail;

/// <summary>Explicit movement of catalog stock between branches. Does not edit past sale lines.</summary>
public class StockTransfer
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int FromBranchId { get; set; }
    public int ToBranchId { get; set; }
    public int Quantity { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int ActingUserId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Product Product { get; set; } = null!;
    public Branch FromBranch { get; set; } = null!;
    public Branch ToBranch { get; set; } = null!;
}
