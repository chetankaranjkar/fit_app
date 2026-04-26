namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// <b>Role mapping</b>: which <see cref="User"/> has which <see cref="AppRole"/>. Part of
    /// AuthUsers → Users → <c>UserRoles</c> → Roles → RolePermissions → Permissions.
    /// </summary>
    public class UserRole : BaseEntity
    {
        public int UserId { get; set; }
        public int RoleId { get; set; }

        public User User { get; set; } = null!;
        public AppRole Role { get; set; } = null!;
    }
}
