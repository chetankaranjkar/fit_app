namespace GymManagement.Domain.Entities;

/// <summary>Extra branches a trainer or staff member may work in. Home branch stays on <see cref="User.HomeBranchId"/>.</summary>
public class UserBranchAssignment : BaseEntity
{
    public int UserId { get; set; }
    public int BranchId { get; set; }

    public User User { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
