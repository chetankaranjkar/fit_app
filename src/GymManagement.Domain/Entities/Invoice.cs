using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities
{
    public enum InvoiceStatus
    {
        Draft,
        Sent,
        Paid,
        Overdue,
        Cancelled,
        Refunded
    }

    public class Invoice : BaseEntity
    {
        [Required]
        [MaxLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        [Required]
        public int UserMembershipId { get; set; }

        [Required]
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime DueDate { get; set; }

        public DateTime? PaidDate { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Subtotal { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal TaxAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal DiscountAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal TotalAmount { get; set; }

        [MaxLength(20)]
        public string? Currency { get; set; } = "USD";

        [MaxLength(500)]
        public string? Notes { get; set; }

        /// <summary>Coupon code applied to this invoice (snapshot).</summary>
        [MaxLength(50)]
        public string? CouponCode { get; set; }

        /// <summary>Coupon discount amount on this invoice.</summary>
        public decimal CouponDiscountAmount { get; set; }

        [Required]
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

        [MaxLength(100)]
        public string? BillingAddress { get; set; }

        [MaxLength(100)]
        public string? BillingCity { get; set; }

        [MaxLength(100)]
        public string? BillingState { get; set; }

        [MaxLength(20)]
        public string? BillingZip { get; set; }

        [MaxLength(100)]
        public string? BillingCountry { get; set; }

        public int? PaymentId { get; set; }

        public int? OrganizationId { get; set; }

        // Navigation properties
        public UserMembership UserMembership { get; set; } = null!;
        public Payment? Payment { get; set; }
        public Organization? Organization { get; set; }
        public ICollection<InvoiceItem> InvoiceItems { get; set; } = new List<InvoiceItem>();
    }
}
