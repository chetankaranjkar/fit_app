namespace GymManagement.Domain.Entities;

/// <summary>
/// Snapshot of one sale or renewal. Renewals that only extend <see cref="UserMembership.EndDate"/>
/// add a period and leave earlier <see cref="MembershipPayment"/> rows unchanged.
/// </summary>
public class MembershipBillingPeriod
{
    public int Id { get; set; }
    public int UserMembershipId { get; set; }
    public int? MembershipPaymentId { get; set; }
    public int? SellingBranchId { get; set; }
    public decimal AgreedPrice { get; set; }
    /// <summary>Plan, Renewal. Registration is not a separate fee in this application.</summary>
    public string FeeType { get; set; } = "Plan";
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public UserMembership UserMembership { get; set; } = null!;
    public MembershipPayment? MembershipPayment { get; set; }
    public Branch? SellingBranch { get; set; }
}
