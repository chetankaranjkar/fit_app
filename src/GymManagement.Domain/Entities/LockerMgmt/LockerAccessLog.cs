namespace GymManagement.Domain.Entities.LockerMgmt
{
    /// <summary>
    /// Locker open/close audit entry.
    /// </summary>
    public class LockerAccessLog : BaseEntity
    {
        public int LockerId { get; set; }
        public Locker? Locker { get; set; }

        public string MemberName { get; set; } = string.Empty;
        public string Action { get; set; } = "OPEN"; // OPEN / CLOSE
        public DateTime AccessTime { get; set; } = DateTime.UtcNow;
    }
}
