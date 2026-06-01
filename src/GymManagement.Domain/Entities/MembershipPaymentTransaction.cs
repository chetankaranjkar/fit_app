namespace GymManagement.Domain.Entities
{
    /// <summary>Audit line for each installment toward a <see cref="MembershipPayment"/> (never physically deleted).</summary>
    public class MembershipPaymentTransaction : BaseEntity
    {
        public int PaymentId { get; set; }

        /// <summary>Auto-generated receipt number (e.g. RCP-2026-000001).</summary>
        public string ReceiptNumber { get; set; } = string.Empty;

        public decimal TransactionAmount { get; set; }

        public MembershipPaymentMethod TransactionMethod { get; set; }

        public string? ReferenceNumber { get; set; }

        public DateTime TransactionDate { get; set; }

        public string? Remarks { get; set; }

        public MembershipPaymentTransactionStatus Status { get; set; } = MembershipPaymentTransactionStatus.Completed;

        /// <summary>Staff <see cref="User.Id"/> who collected (optional).</summary>
        public int? CollectedByUserId { get; set; }

        public int? ModifiedByUserId { get; set; }

        [System.ComponentModel.DataAnnotations.MaxLength(500)]
        public string? VoidReason { get; set; }

        public int? VoidedByUserId { get; set; }
        public DateTime? VoidedDate { get; set; }

        public decimal? RefundAmount { get; set; }

        [System.ComponentModel.DataAnnotations.MaxLength(500)]
        public string? RefundReason { get; set; }

        public int? RefundedByUserId { get; set; }
        public DateTime? RefundedDate { get; set; }

        public MembershipPayment Payment { get; set; } = null!;
    }
}
