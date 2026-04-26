namespace GymManagement.Domain.Entities
{
    public class Branch
    {
        public int Id { get; set; }
        public int? OrganizationId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }
        public bool IsActive { get; set; } = true;

        public Organization? Organization { get; set; }
        public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    }
}
