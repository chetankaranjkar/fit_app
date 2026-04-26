namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// <b>Permissions</b> (fine-grained capability codes). Reached through Roles → <see cref="RolePermission"/> → Permissions.
    /// </summary>
    public class Permission : BaseEntity
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
