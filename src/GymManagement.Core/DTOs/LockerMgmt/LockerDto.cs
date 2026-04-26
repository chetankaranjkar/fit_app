namespace GymManagement.Core.DTOs.LockerMgmt
{
    public class LockerDto
    {
        public int Id { get; set; }
        public string LockerNumber { get; set; } = string.Empty;
        public string Size { get; set; } = "Medium";
        public string Status { get; set; } = "AVAILABLE";
        public string? Location { get; set; }
    }

    public class CreateLockerDto
    {
        public string LockerNumber { get; set; } = string.Empty;
        public string Size { get; set; } = "Medium";
        public string Status { get; set; } = "AVAILABLE";
        public string? Location { get; set; }
    }

    public class UpdateLockerDto
    {
        public string? LockerNumber { get; set; }
        public string? Size { get; set; }
        public string? Status { get; set; }
        public string? Location { get; set; }
    }
}
