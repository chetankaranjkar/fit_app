namespace GymManagement.Core.DTOs.LockerMgmt
{
    public class LockerMaintenanceDto
    {
        public int Id { get; set; }
        public int LockerId { get; set; }
        public string LockerNumber { get; set; } = string.Empty;
        public string Issue { get; set; } = string.Empty;
        public DateTime ReportedDate { get; set; }
        public string Status { get; set; } = "PENDING";
    }

    public class CreateLockerMaintenanceDto
    {
        public int LockerId { get; set; }
        public string Issue { get; set; } = string.Empty;
        public DateTime ReportedDate { get; set; }
        public string Status { get; set; } = "PENDING";
    }

    public class UpdateMaintenanceStatusDto
    {
        public string Status { get; set; } = "PENDING";
    }
}
