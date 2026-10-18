namespace GymManagement.Core.DTOs;

public sealed class PlanBranchPriceSettingDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public bool BranchActive { get; set; }
    public decimal? Price { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsConfigured { get; set; }
}
