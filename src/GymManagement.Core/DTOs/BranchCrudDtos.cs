namespace GymManagement.Core.DTOs;

public sealed class BranchCrudDto
{
    public int Id { get; set; }
    public int? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactNumber { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Esp32DoorBaseUrl { get; set; }
    public bool IsActive { get; set; }
}

public sealed class BranchCreateDto
{
    public int? OrganizationId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactNumber { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Esp32DoorBaseUrl { get; set; }
}

public sealed class BranchUpdateDto
{
    public int? OrganizationId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? ContactNumber { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Esp32DoorBaseUrl { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class OrganizationOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
