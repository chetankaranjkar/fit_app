namespace GymManagement.Domain.Entities.LockerMgmt
{
    /// <summary>
    /// Locker Management module — physical locker unit.
    /// Isolated in its own namespace so nothing in the core domain depends on it.
    /// </summary>
    public class Locker : BaseEntity
    {
        public string LockerNumber { get; set; } = string.Empty;
        public string Size { get; set; } = "Medium";     // Small / Medium / Large
        public string Status { get; set; } = "AVAILABLE"; // AVAILABLE / OCCUPIED / MAINTENANCE
        public string? Location { get; set; }

        public ICollection<LockerAssignment> Assignments { get; set; } = new List<LockerAssignment>();
        public ICollection<LockerAccessLog> AccessLogs { get; set; } = new List<LockerAccessLog>();
        public ICollection<LockerMaintenance> MaintenanceRecords { get; set; } = new List<LockerMaintenance>();
    }
}
