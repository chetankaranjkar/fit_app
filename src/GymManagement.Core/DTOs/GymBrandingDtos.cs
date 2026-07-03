namespace GymManagement.Core.DTOs;

public sealed class GymBrandingDto
{
    public string GymName { get; set; } = "Gym Management";
    public string? GymLogoUrl { get; set; }
    public string? InvoiceLogoUrl { get; set; }
}

public sealed class UpdateGymBrandingDto
{
    public string GymName { get; set; } = string.Empty;
    public string? GymLogoUrl { get; set; }
    public string? InvoiceLogoUrl { get; set; }
}
