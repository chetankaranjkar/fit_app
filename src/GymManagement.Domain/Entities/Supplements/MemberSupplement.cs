using GymManagement.Domain.Entities.Retail;

namespace GymManagement.Domain.Entities.Supplements;

/// <summary>Supplement assigned to a member with dosage, timing, and duration.</summary>
public class MemberSupplement : BaseEntity
{
    public int UserId { get; set; }
    public int SupplementMasterId { get; set; }
    public string Dosage { get; set; } = string.Empty;
    public string Timing { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public int? AssignedByUserId { get; set; }
    public string Status { get; set; } = "Active";
    public int? ProductId { get; set; }

    public User User { get; set; } = null!;
    public SupplementMaster SupplementMaster { get; set; } = null!;
    public User? AssignedByUser { get; set; }
    public Product? Product { get; set; }
}
