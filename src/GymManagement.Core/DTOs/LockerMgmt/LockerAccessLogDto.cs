namespace GymManagement.Core.DTOs.LockerMgmt
{
    public class LockerAccessLogDto
    {
        public int Id { get; set; }
        public int LockerId { get; set; }
        public string LockerNumber { get; set; } = string.Empty;
        public string MemberName { get; set; } = string.Empty;
        public string Action { get; set; } = "OPEN";
        public DateTime AccessTime { get; set; }
    }

    public class CreateLockerAccessLogDto
    {
        public int LockerId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string Action { get; set; } = "OPEN";
        public DateTime? AccessTime { get; set; }
    }
}
