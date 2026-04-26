namespace GymManagement.Domain.Entities.LockerMgmt
{
    /// <summary>
    /// Maintenance ticket logged against a locker.
    /// </summary>
    public class LockerMaintenance : BaseEntity
    {
        public int LockerId { get; set; }
        public Locker? Locker { get; set; }

        public string Issue { get; set; } = string.Empty;
        public DateTime ReportedDate { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "PENDING"; // PENDING / FIXED
    }
}
