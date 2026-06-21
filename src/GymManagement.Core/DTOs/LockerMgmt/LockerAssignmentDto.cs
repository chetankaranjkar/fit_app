namespace GymManagement.Core.DTOs.LockerMgmt
{
    public class LockerAssignmentDto
    {
        public int Id { get; set; }
        public int LockerId { get; set; }
        public string LockerNumber { get; set; } = string.Empty;
        public int? UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        /// <summary>Physical locker state: AVAILABLE / OCCUPIED / MAINTENANCE.</summary>
        public string LockerStatus { get; set; } = string.Empty;
        /// <summary>Assignment window: Active or Expired (based on expiry date).</summary>
        public string AssignmentStatus { get; set; } = "Active";
    }

    public class CreateLockerAssignmentDto
    {
        public int LockerId { get; set; }
        public int? UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime ExpiryDate { get; set; }
    }
}
