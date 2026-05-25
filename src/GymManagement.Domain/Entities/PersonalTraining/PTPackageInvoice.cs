using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    /// <summary>PT billing header (parallel to retail POS / membership payments).</summary>
    public class PTPackageInvoice : BaseEntity
    {
        [Required]
        [MaxLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        public InvoiceCategoryType Category { get; set; } = InvoiceCategoryType.PTPackage;

        public int UserId { get; set; }
        public int TrainerId { get; set; }
        public int PackageId { get; set; }

        public int SessionCount { get; set; }
        public int ValidityDays { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal Subtotal { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TaxAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal DiscountAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal CouponDiscountAmount { get; set; }

        [MaxLength(50)]
        public string? CouponCode { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal PaidAmount { get; set; }

        public PTPaymentStatus PaymentStatus { get; set; } = PTPaymentStatus.Pending;

        public DateTime IssueDate { get; set; } = DateTime.UtcNow;
        public DateTime? PaidDate { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public int? CashierUserId { get; set; }
        public int? OrganizationId { get; set; }

        public User User { get; set; } = null!;
        public Trainer Trainer { get; set; } = null!;
        public PTPackage Package { get; set; } = null!;
        public MemberPTPackage? MemberPackage { get; set; }
    }
}
