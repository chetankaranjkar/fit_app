namespace GymManagement.Domain.Entities;

/// <summary>
/// Written when a branch is deactivated while people, assets, or bills remain.
/// The related rows stay where they are.
/// </summary>
public class BranchClosureRecord
{
    public int Id { get; set; }
    public int BranchId { get; set; }
    public string HandlingPolicy { get; set; } = string.Empty;
    public string CountsSnapshot { get; set; } = string.Empty;
    public int? ActingUserId { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Branch Branch { get; set; } = null!;
}
