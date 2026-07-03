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
        /// <summary>UI origin for audit (e.g. members_list_modal, user_memberships_page).</summary>
        public string? CreationSource { get; set; }
        /// <summary>create or renew — renew writes <see cref="MembershipAuditAction.Renewed"/>.</summary>
        public string? Intent { get; set; }
        public int? PriorMembershipId { get; set; }
    }

    public class UpdateUserMembershipDto
    {
        public int? PlanId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public MembershipStatus? Status { get; set; }
        public DateTime? FreezeStartDate { get; set; }
        public DateTime? FreezeEndDate { get; set; }
        public string? FreezeReason { get; set; }
    }

    /// <summary>Staff renewal queue: memberships ending within a date window or recently expired.</summary>
    public sealed class ExpiringMembershipQueueItemDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public MembershipStatus Status { get; set; }
        public string? UserName { get; set; }
        public string? MemberPhone { get; set; }
        public string? PlanName { get; set; }
        public int DaysRemaining { get; set; }
        public bool IsExpired { get; set; }
        public int? MembershipPaymentId { get; set; }
        public decimal PendingAmount { get; set; }
        public string? PaymentStatus { get; set; }
        public bool IsFullyPaid { get; set; }
    }
}
