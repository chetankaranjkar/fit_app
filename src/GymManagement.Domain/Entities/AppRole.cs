namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// <b>Roles</b> catalog (table <c>Roles</c>; e.g. ADMIN, MEMBER). Links to users via <see cref="UserRole"/>;
    /// to permissions via <see cref="RolePermission"/>. Distinct from the login <c>Role</c> enum on tokens.
    /// </summary>
    public class AppRole : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
