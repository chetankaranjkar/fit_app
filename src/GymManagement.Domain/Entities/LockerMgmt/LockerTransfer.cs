using GymManagement.Domain.Entities;

namespace GymManagement.Domain.Entities.LockerMgmt;

/// <summary>Moves an empty locker to another branch. Does not rewrite assignment history.</summary>
public class LockerTransfer
{
    public int Id { get; set; }
    public int LockerId { get; set; }
    public int? FromBranchId { get; set; }
    public int ToBranchId { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int ActingUserId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Locker Locker { get; set; } = null!;
    public Branch? FromBranch { get; set; }
    public Branch ToBranch { get; set; } = null!;
}
