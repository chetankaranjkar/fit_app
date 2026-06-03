using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public sealed class MembershipApprovalRequestDto
    {
        public int Id { get; set; }
        public int MembershipId { get; set; }
        public int MemberId { get; set; }
        public string? MemberName { get; set; }
        public string? MemberPhotoUrl { get; set; }
        public string? MemberCode { get; set; }
        public string? PlanName { get; set; }
        public DateTime? MembershipStartDate { get; set; }
        public DateTime? MembershipEndDate { get; set; }
        public MembershipApprovalRequestType RequestType { get; set; }
        public MembershipApprovalRequestStatus Status { get; set; }
        public string Reason { get; set; } = string.Empty;
        public int RequestedByUserId { get; set; }
        public string? RequestedByName { get; set; }
        public DateTime RequestedDate { get; set; }
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public int? RejectedByUserId { get; set; }
        public string? RejectedByName { get; set; }
        public DateTime? RejectedDate { get; set; }
        public string? AdminRemarks { get; set; }
        public bool HasPaymentRecords { get; set; }
        public decimal? MembershipFee { get; set; }
        public decimal? TotalPaid { get; set; }
        public decimal? OutstandingBalance { get; set; }
        public string? ProposedChangesJson { get; set; }
    }

    public sealed class CreateMembershipApprovalRequestDto
    {
        public int MembershipId { get; set; }
        public MembershipApprovalRequestType RequestType { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? ProposedChangesJson { get; set; }
    }

    public sealed class ApproveMembershipApprovalRequestDto
    {
        public string? AdminRemarks { get; set; }
    }

    public sealed class RejectMembershipApprovalRequestDto
    {
        public string? AdminRemarks { get; set; }
    }

    public sealed class MembershipAuditLogDto
    {
        public long Id { get; set; }
        public int MembershipId { get; set; }
        public MembershipAuditAction Action { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public int PerformedByUserId { get; set; }
        public string? PerformedByName { get; set; }
        public DateTime PerformedDate { get; set; }
        public string? IPAddress { get; set; }
        public string? DeviceInfo { get; set; }
    }

    public enum MembershipApprovalRequestStatusFilter
    {
        Pending,
        Approved,
        Rejected,
        All,
    }
}
