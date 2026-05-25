namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Staff / reception / accounts profile (1:1 with <see cref="User"/>). Identity stays on <see cref="User"/>.
    /// </summary>
    public class Staff : BaseEntity
    {
        public int UserId { get; set; }
        public string? EmployeeCode { get; set; }
        /// <summary>e.g. reception, accounts, operations</summary>
        public string? Department { get; set; }
        public string? JobTitle { get; set; }
        public string? ShiftType { get; set; }
        public DateTime? JoiningDate { get; set; }
        public bool IsActive { get; set; } = true;

        public User User { get; set; } = null!;
    }
}
