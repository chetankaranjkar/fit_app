namespace GymManagement.Domain.Entities;

public class MemberBranchTransfer
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? FromBranchId { get; set; }
    public int ToBranchId { get; set; }
    public DateTime EffectiveDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int ActingUserId { get; set; }
    /// <summary>None, or UpdateAccess when the operator explicitly changes current membership entry branches.</summary>
    public string AccessDecision { get; set; } = "None";
    /// <summary>None. Transfers never rewrite bills.</summary>
    public string FinancialDecision { get; set; } = "None";
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Branch? FromBranch { get; set; }
    public Branch ToBranch { get; set; } = null!;
    public User ActingUser { get; set; } = null!;
}
