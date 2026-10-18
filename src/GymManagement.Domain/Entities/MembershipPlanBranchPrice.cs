namespace GymManagement.Domain.Entities;

/// <summary>Branch price for a shared <see cref="MembershipPlan"/>. Absence of a row is not another branch's price.</summary>
public class MembershipPlanBranchPrice : BaseEntity
{
    public int PlanId { get; set; }
    public int BranchId { get; set; }
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; } = true;

    public MembershipPlan Plan { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
