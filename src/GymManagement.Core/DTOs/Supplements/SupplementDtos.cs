namespace GymManagement.Core.DTOs.Supplements;

public class SupplementMasterDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? DefaultDosage { get; set; }
    public bool IsActive { get; set; }
    public int? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? ProductSku { get; set; }
}

public class UpsertSupplementMasterDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? DefaultDosage { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ProductId { get; set; }
}

public class MemberSupplementDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? MemberName { get; set; }
    public int SupplementMasterId { get; set; }
    public string SupplementName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Timing { get; set; } = string.Empty;
    public string TimingLabel { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public int? AssignedByUserId { get; set; }
    public string? AssignedByName { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsCurrentlyActive { get; set; }
    public int? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Instructions { get; set; }
    public int? DaysRemaining { get; set; }
    public int? CompliancePercent { get; set; }
}

public class CreateMemberSupplementDto
{
    public int UserId { get; set; }
    public int SupplementMasterId { get; set; }
    public string Dosage { get; set; } = string.Empty;
    public string Timing { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public int? ProductId { get; set; }
}

public class UpdateMemberSupplementDto
{
    public string Dosage { get; set; } = string.Empty;
    public string Timing { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? ProductId { get; set; }
}

public class SupplementAnalyticsDto
{
    public IReadOnlyList<SupplementAssignmentStatDto> MostAssigned { get; set; } = [];
    public int ActiveSupplementUsers { get; set; }
    public int TotalActiveAssignments { get; set; }
    public IReadOnlyList<SupplementCategoryStatDto> CategoryUsage { get; set; } = [];
}

public class SupplementAssignmentStatDto
{
    public int SupplementMasterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int AssignmentCount { get; set; }
    public int ActiveCount { get; set; }
}

public class SupplementCategoryStatDto
{
    public string Category { get; set; } = string.Empty;
    public int ActiveAssignments { get; set; }
    public int TotalAssignments { get; set; }
}
