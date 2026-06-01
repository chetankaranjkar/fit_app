using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public sealed class WaiveOffRequestDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? MemberName { get; set; }
        public string? MemberPhotoUrl { get; set; }
        public int MembershipPaymentId { get; set; }
        public string? PlanName { get; set; }
        public decimal MembershipFee { get; set; }
        public decimal CouponDiscount { get; set; }
        public decimal RequestedAmount { get; set; }
        public decimal ApprovedWaiveOffTotal { get; set; }
        public string Reason { get; set; } = string.Empty;
        public WaiveOffRequestStatus Status { get; set; }
        public int RequestedByUserId { get; set; }
        public string? RequestedByName { get; set; }
        public DateTime RequestedDate { get; set; }
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public int? RejectedByUserId { get; set; }
        public string? RejectedByName { get; set; }
        public DateTime? RejectedDate { get; set; }
        public string? RejectionReason { get; set; }
    }

    public sealed class CreateWaiveOffRequestDto
    {
        public int MembershipPaymentId { get; set; }
        public decimal RequestedAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public sealed class RejectWaiveOffRequestDto
    {
        public string? RejectionReason { get; set; }
    }

    public sealed class VoidPaymentTransactionDto
    {
        public string VoidReason { get; set; } = string.Empty;
    }

    public sealed class RefundPaymentTransactionDto
    {
        public decimal RefundAmount { get; set; }
        public string RefundReason { get; set; } = string.Empty;
    }

    public sealed class DuplicatePaymentCheckDto
    {
        public bool IsDuplicate { get; set; }
        public string? Message { get; set; }
        public int? ExistingTransactionId { get; set; }
    }

    public sealed class MembershipPaymentTransactionListDto
    {
        public int Id { get; set; }
        public int PaymentId { get; set; }
        public int UserId { get; set; }
        public string? MemberName { get; set; }
        public string? MemberPhotoUrl { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public decimal TransactionAmount { get; set; }
        public MembershipPaymentMethod TransactionMethod { get; set; }
        public MembershipPaymentTransactionStatus Status { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Remarks { get; set; }
        public int? CollectedByUserId { get; set; }
        public string? CollectedByName { get; set; }
        public string? PlanName { get; set; }
    }

    public sealed class MembershipPaymentTransactionQuery
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public MembershipPaymentTransactionStatus? Status { get; set; }
        public int? UserId { get; set; }
        public MembershipPaymentMethod? Method { get; set; }
    }

    public sealed class EnterpriseBillingDashboardDto
    {
        public decimal TotalMembershipRevenue { get; set; }
        public decimal TotalPaymentsReceived { get; set; }
        public decimal OutstandingDues { get; set; }
        public decimal TotalCouponDiscounts { get; set; }
        public decimal TotalApprovedWaiveOff { get; set; }
        public int PendingWaiveOffRequests { get; set; }
        public int VoidedPaymentsCount { get; set; }
        public int RefundedPaymentsCount { get; set; }
        public decimal MonthlyCollections { get; set; }
        public decimal DailyCollections { get; set; }
        public IReadOnlyList<MemberOutstandingDto> TopDefaulters { get; set; } = Array.Empty<MemberOutstandingDto>();
        public int PendingPaymentsCount { get; set; }
        public decimal TotalPendingAmount { get; set; }
        public int OverdueMembersCount { get; set; }
        public decimal TodayCollections { get; set; }
    }

    public sealed class MemberOutstandingDto
    {
        public int UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        public decimal OutstandingBalance { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string? PlanName { get; set; }
    }

    public sealed class MemberLedgerDto
    {
        public int UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        public IReadOnlyList<MemberLedgerPeriodDto> Periods { get; set; } = Array.Empty<MemberLedgerPeriodDto>();
    }

    public sealed class MemberLedgerPeriodDto
    {
        public int MembershipPaymentId { get; set; }
        public string? PlanName { get; set; }
        public decimal MembershipFee { get; set; }
        public decimal CouponDiscount { get; set; }
        public decimal ApprovedWaiveOff { get; set; }
        public decimal NetPayable { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal OutstandingBalance { get; set; }
        public IReadOnlyList<MembershipPaymentTransactionDto> Payments { get; set; } = Array.Empty<MembershipPaymentTransactionDto>();
    }

    public sealed class BillingReportDto
    {
        public string ReportType { get; set; } = string.Empty;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalAmount { get; set; }
        public int RecordCount { get; set; }
        public IReadOnlyList<BillingReportLineDto> Lines { get; set; } = Array.Empty<BillingReportLineDto>();
    }

    public sealed class BillingReportLineDto
    {
        public DateTime Date { get; set; }
        public string? ReceiptNumber { get; set; }
        public string? MemberName { get; set; }
        public decimal Amount { get; set; }
        public string? Method { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public sealed class FinancialAuditLogDto
    {
        public int Id { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string Action { get; set; } = string.Empty;
        public int? ActorUserId { get; set; }
        public string? ActorName { get; set; }
        public DateTime CreatedDate { get; set; }
        public string? DetailsJson { get; set; }
        public int? MembershipPaymentId { get; set; }
        public int? UserId { get; set; }
    }
}
