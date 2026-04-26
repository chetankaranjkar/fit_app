namespace GymManagement.Core.DTOs
{
    public class MembershipPlanDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string? Description { get; set; }
    }

    public class CreateMembershipPlanDto
    {
        public string PlanName { get; set; } = string.Empty;
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateMembershipPlanDto
    {
        public string? PlanName { get; set; }
        public int? DurationDays { get; set; }
        public decimal? Price { get; set; }
        public string? Description { get; set; }
    }
}
