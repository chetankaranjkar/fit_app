using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public sealed class PendingMembershipPaymentRedirectDto
    {
        public int UserId { get; set; }
        public int MembershipId { get; set; }
        public int MembershipPlanId { get; set; }
        public decimal MembershipAmount { get; set; }
        public int MembershipDurationDays { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int MembershipPaymentId { get; set; }
    }

    public sealed class MembershipPaymentDto
    {
        public int Id { get; set; }
        public string PaymentNumber { get; set; } = string.Empty;
        public int UserId { get; set; }
        public int MembershipId { get; set; }
        public string? InvoiceNumber { get; set; }
        public int? InvoiceId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal WaiverAmount { get; set; }
        /// <summary>TotalAmount − DiscountAmount − WaiverAmount (amount required to close billing).</summary>
        public decimal NetPayableAmount { get; set; }
        /// <summary>True when PaymentStatus is Paid (full settlement).</summary>
        public bool IsFullyPaid { get; set; }
        /// <summary>True when PaymentStatus is Partial (installment with balance remaining).</summary>
        public bool IsPartiallyPaid { get; set; }
        public MembershipPaymentStatus PaymentStatus { get; set; }
        public MembershipPaymentMethod? LastPaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string? Notes { get; set; }
        public MembershipStatus MembershipStatus { get; set; }
        public string? PlanName { get; set; }
        public IReadOnlyList<MembershipPaymentTransactionDto> Transactions { get; set; } = Array.Empty<MembershipPaymentTransactionDto>();
    }

    public sealed class MembershipPaymentTransactionDto
    {
        public int Id { get; set; }
        public decimal TransactionAmount { get; set; }
        public MembershipPaymentMethod TransactionMethod { get; set; }
        public string? ReferenceNumber { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? Remarks { get; set; }
        public int? CollectedByUserId { get; set; }
        public string? CollectedByName { get; set; }
    }

    public sealed class RecordMembershipPaymentInstallmentDto
    {
        public decimal Amount { get; set; }
        public MembershipPaymentMethod Method { get; set; }
        public string? ReferenceNumber { get; set; }
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public DateTime? NextDueDate { get; set; }
        public string? Remarks { get; set; }
        /// <summary>Optional discount adjustment applied to header (not per transaction).</summary>
        public decimal? DiscountAmount { get; set; }
    }

    public sealed class MembershipPaymentDashboardDto
    {
        public int PendingPaymentsCount { get; set; }
        public decimal TotalPendingAmount { get; set; }
        public int OverdueMembersCount { get; set; }
        public decimal TodayCollections { get; set; }
        public int UpcomingDueCount { get; set; }
        public int PartialMembersCount { get; set; }
    }

    public sealed class MemberBillingAccessDto
    {
        public bool AccessBlocked { get; set; }
        public decimal? PendingAmount { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string? Message { get; set; }
        public int? MembershipPaymentId { get; set; }
    }

    public sealed class PaymentAccessBlockedResponse
    {
        public const string CodeConst = "PAYMENT_ACCESS_BLOCKED";
        public string Code { get; set; } = CodeConst;
        public string Message { get; set; } = string.Empty;
        public decimal? PendingAmount { get; set; }
        public DateTime? DueDate { get; set; }
    }
}
