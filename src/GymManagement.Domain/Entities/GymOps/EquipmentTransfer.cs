using GymManagement.Domain.Entities;

namespace GymManagement.Domain.Entities.GymOps;

/// <summary>Moves an asset to another branch. Does not rewrite maintenance history.</summary>
public class EquipmentTransfer
{
    public int Id { get; set; }
    public int EquipmentId { get; set; }
    public int? FromBranchId { get; set; }
    public int ToBranchId { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int ActingUserId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Equipment Equipment { get; set; } = null!;
    public Branch? FromBranch { get; set; }
    public Branch ToBranch { get; set; } = null!;
}
