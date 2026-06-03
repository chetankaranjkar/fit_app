namespace GymManagement.Core.DTOs;

/// <summary>User row for the Roles &amp; permissions → User roles assignment UI.</summary>
public sealed class UserRoleAssignmentDto
{
    public int UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Username { get; set; }
    public bool IsActive { get; set; }
    public List<AppRoleDto> AppRoles { get; set; } = new();
}
