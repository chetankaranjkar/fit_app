namespace GymManagement.Core.DTOs
{
    public class AppRoleDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public List<int> PermissionIds { get; set; } = new();
    }

    public class CreateAppRoleDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public List<int> PermissionIds { get; set; } = new();
    }

    public class UpdateAppRoleDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
        public List<int>? PermissionIds { get; set; }
    }
}
