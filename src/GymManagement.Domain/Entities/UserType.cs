namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Type of user (e.g. Admin, Instructor, Staff). A user can have many types via UserUserTypes.
    /// </summary>
    public class UserType : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<UserUserType> UserUserTypes { get; set; } = new List<UserUserType>();
    }
}
