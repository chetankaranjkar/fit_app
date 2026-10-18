namespace GymManagement.Domain.Entities;

/// <summary>Branches a membership may visit when access is <c>Selected</c>. Home branch is stored separately.</summary>
public class UserMembershipAccessBranch
{
    public int Id { get; set; }
    public int UserMembershipId { get; set; }
    public int BranchId { get; set; }

    public UserMembership UserMembership { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
