using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class UserMembershipDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public MembershipStatus Status { get; set; }
        public DateTime? FreezeStartDate { get; set; }
        public DateTime? FreezeEndDate { get; set; }
        public string? FreezeReason { get; set; }
        public string? UserName { get; set; }
        public string? PlanName { get; set; }
    }

    public class CreateUserMembershipDto
    {
        public int UserId { get; set; }
        public int PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public MembershipStatus Status { get; set; } = MembershipStatus.Active;
        public DateTime? FreezeStartDate { get; set; }
        public DateTime? FreezeEndDate { get; set; }
        public string? FreezeReason { get; set; }
    }

    public class UpdateUserMembershipDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public MembershipStatus? Status { get; set; }
        public DateTime? FreezeStartDate { get; set; }
        public DateTime? FreezeEndDate { get; set; }
        public string? FreezeReason { get; set; }
    }
}
