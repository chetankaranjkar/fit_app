namespace GymManagement.Core.DTOs.LockerMgmt
{
    public class LockerAssignmentDto
    {
        public int Id { get; set; }
        public int LockerId { get; set; }
        public string LockerNumber { get; set; } = string.Empty;
        public string MemberName { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime ExpiryDate { get; set; }
    }

    public class CreateLockerAssignmentDto
    {
        public int LockerId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public DateTime AssignedDate { get; set; }
        public DateTime ExpiryDate { get; set; }
    }
}
