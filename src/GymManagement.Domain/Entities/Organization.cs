namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Organization (Gym, Corporate, Franchise). Branches, Users, Trainers, and key plans belong to an organization.
    /// </summary>
    public class Organization
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? OrganizationType { get; set; } // Gym, Corporate, Franchise
        public int? SubscriptionPlanId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public ICollection<Branch> Branches { get; set; } = new List<Branch>();
        public ICollection<User> Users { get; set; } = new List<User>();
        public ICollection<Trainer> Trainers { get; set; } = new List<Trainer>();
        public ICollection<WorkoutPlan> WorkoutPlans { get; set; } = new List<WorkoutPlan>();
        public ICollection<DietPlan> DietPlans { get; set; } = new List<DietPlan>();
        public ICollection<MembershipPlan> MembershipPlans { get; set; } = new List<MembershipPlan>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    }
}
