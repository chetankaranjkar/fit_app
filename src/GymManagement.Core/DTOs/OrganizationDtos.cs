namespace GymManagement.Core.DTOs;

public sealed class OrganizationListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? OrganizationType { get; set; }
    public bool IsActive { get; set; }
}

public sealed class OrganizationCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? OrganizationType { get; set; }
}
