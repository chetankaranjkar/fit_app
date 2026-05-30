using GymManagement.Domain.Entities.Retail;

namespace GymManagement.Domain.Entities.Supplements;

/// <summary>Organization supplement catalog (not retail inventory).</summary>
public class SupplementMaster : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? DefaultDosage { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ProductId { get; set; }
    public int? OrganizationId { get; set; }

    public Product? Product { get; set; }
    public ICollection<MemberSupplement> MemberSupplements { get; set; } = new List<MemberSupplement>();
}
