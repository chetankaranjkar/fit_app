namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Enterprise billing header for a single <see cref="UserMembership"/> (one active row per membership).
    /// Installments are stored in <see cref="MembershipPaymentTransaction"/>.
    /// </summary>
    public class MembershipPayment : BaseEntity
    {
        /// <summary>Human-readable unique number (e.g. MP-2026-000001).</summary>
        public string PaymentNumber { get; set; } = string.Empty;

        public int UserId { get; set; }
        public int MembershipId { get; set; }

        /// <summary>Optional link to generated pro-forma or final invoice.</summary>
        public string? InvoiceNumber { get; set; }

        public int? InvoiceId { get; set; }

        /// <summary>Gross amount (plan total) before discount.</summary>
        public decimal TotalAmount { get; set; }

        /// <summary>Sum of successful installment amounts (net of overpayment guard).</summary>
        public decimal PaidAmount { get; set; }

        /// <summary>Cached pending = NetPayable - PaidAmount.</summary>
        public decimal PendingAmount { get; set; }

        public decimal DiscountAmount { get; set; }

        /// <summary>Optional write-off / waiver (future-ready).</summary>
        public decimal WaiverAmount { get; set; }

        public MembershipPaymentStatus PaymentStatus { get; set; } = MembershipPaymentStatus.Pending;

        public MembershipPaymentMethod? LastPaymentMethod { get; set; }

        /// <summary>Last time money was collected (header-level).</summary>
        public DateTime? PaymentDate { get; set; }

        /// <summary>Required while status is Partial / Overdue with outstanding balance.</summary>
        public DateTime? NextDueDate { get; set; }

        public string? Notes { get; set; }

        /// <summary><see cref="User.Id"/> of staff who last updated payment header (optional).</summary>
        public int? ReceivedByUserId { get; set; }

        public DateTime? DueReminderLastSentAt { get; set; }

        public int? OrganizationId { get; set; }

        public User User { get; set; } = null!;
        public UserMembership Membership { get; set; } = null!;
        public Invoice? Invoice { get; set; }
        public Organization? Organization { get; set; }

        public ICollection<MembershipPaymentTransaction> Transactions { get; set; } =
            new List<MembershipPaymentTransaction>();
    }
}
