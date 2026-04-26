namespace GymManagement.Domain.Entities
{
    public class MembershipPlan : BaseEntity
    {
        public string PlanName { get; set; } = string.Empty;  // Monthly, Quarterly, Yearly
        public int DurationDays { get; set; }                 // 30, 90, 365
        public decimal Price { get; set; }
        public string? Description { get; set; }
        public int? OrganizationId { get; set; }

        public Organization? Organization { get; set; }
        public ICollection<UserMembership> UserMemberships { get; set; } = new List<UserMembership>();
    }
}
