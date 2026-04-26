namespace GymManagement.Domain.Entities.LockerMgmt
{
    /// <summary>
    /// A locker assignment — links a member (by name for now) to a locker
    /// for a given date range.
    /// </summary>
    public class LockerAssignment : BaseEntity
    {
        public int LockerId { get; set; }
        public Locker? Locker { get; set; }

        public string MemberName { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime ExpiryDate { get; set; }
    }
}
