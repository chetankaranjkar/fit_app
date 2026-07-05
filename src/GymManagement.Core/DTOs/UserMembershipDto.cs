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
        public string? MemberPhone { get; set; }
        public int DaysRemaining { get; set; }
        public bool IsExpired { get; set; }
        public int? MembershipPaymentId { get; set; }
        public decimal PendingAmount { get; set; }
        public string? PaymentStatus { get; set; }
        public bool IsFullyPaid { get; set; }
        /// <summary>True when completed payment transactions exist — direct date/plan edits require approval.</summary>
        public bool HasCompletedPayments { get; set; }
    }

    public sealed class UserMembershipSummaryDto
    {
        public int Total { get; set; }
        public int Active { get; set; }
        public int PaymentDue { get; set; }
        public int Expiring14d { get; set; }
        public int VoidPending { get; set; }
        public int Expired { get; set; }
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

    /// <summary>Extend the current membership end date by one plan duration (staff renew access).</summary>
    public sealed class RenewMembershipAccessDto
    {
        public int? PlanId { get; set; }
    }

    /// <summary>Snapshot restored by POST …/revert-last-renewal (from last Renewed audit OldValue).</summary>
    public sealed class LastRenewalRevertPreviewDto
    {
        public int MembershipId { get; set; }
        public int CurrentPlanId { get; set; }
        public string? CurrentPlanName { get; set; }
        public DateTime CurrentEndDate { get; set; }
        public int PreviousPlanId { get; set; }
        public string? PreviousPlanName { get; set; }
        public DateTime PreviousStartDate { get; set; }
        public DateTime PreviousEndDate { get; set; }
        public MembershipStatus PreviousStatus { get; set; }
        public DateTime LastRenewedAt { get; set; }
        public string? LastRenewedByName { get; set; }
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
