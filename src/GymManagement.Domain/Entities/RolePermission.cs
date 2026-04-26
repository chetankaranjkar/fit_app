namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// <b>RolePermissions</b>: assigns <see cref="Permission"/>s to an <see cref="AppRole"/> (many-to-many).
    /// </summary>
    public class RolePermission : BaseEntity
    {
        public int RoleId { get; set; }
        public int PermissionId { get; set; }

        public AppRole Role { get; set; } = null!;
        public Permission Permission { get; set; } = null!;
    }
}
