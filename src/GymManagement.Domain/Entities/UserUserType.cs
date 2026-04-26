namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Many-to-many: User can have many UserTypes.
    /// </summary>
    public class UserUserType : BaseEntity
    {
        public int UserId { get; set; }
        public int UserTypeId { get; set; }

        public User User { get; set; } = null!;
        public UserType UserType { get; set; } = null!;
    }
}
