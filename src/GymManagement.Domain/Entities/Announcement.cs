namespace GymManagement.Domain.Entities
{
    public class Announcement
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Message { get; set; }
        public int? BranchId { get; set; }
        public int? OrganizationId { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public Branch? Branch { get; set; }
        public Organization? Organization { get; set; }
    }
}
