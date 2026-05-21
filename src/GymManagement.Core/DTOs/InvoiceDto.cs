using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Core.DTOs
{
    public class InvoiceDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int UserMembershipId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime? PaidDate { get; set; }
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = "USD";
        public string? Notes { get; set; }
        public InvoiceStatus Status { get; set; }
        public string? CouponCode { get; set; }
        public decimal CouponDiscountAmount { get; set; }
        public string? BillingAddress { get; set; }
        public string? BillingCity { get; set; }
        public string? BillingState { get; set; }
        public string? BillingZip { get; set; }
        public string? BillingCountry { get; set; }
        public int? PaymentId { get; set; }
        public ICollection<InvoiceItemDto> Items { get; set; } = new List<InvoiceItemDto>();
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateInvoiceDto
    {
        [Required]
        public int UserMembershipId { get; set; }

        [Required]
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime DueDate { get; set; }

        public DateTime? PaidDate { get; set; }

        [Required]
        public List<CreateInvoiceItemDto> Items { get; set; } = new List<CreateInvoiceItemDto>();

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal TaxRate { get; set; } = 0.10m; // Default 10% tax

        [Column(TypeName = "decimal(10,2)")]
        public decimal DiscountAmount { get; set; } = 0;

        public string? Notes { get; set; }

        public string? BillingAddress { get; set; }

        public string? BillingCity { get; set; }

        public string? BillingState { get; set; }

        public string? BillingZip { get; set; }

        public string? BillingCountry { get; set; }
    }

    public class UpdateInvoiceDto
    {
        public DateTime? IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? PaidDate { get; set; }
        public InvoiceStatus? Status { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? Notes { get; set; }
        public string? BillingAddress { get; set; }
        public string? BillingCity { get; set; }
        public string? BillingState { get; set; }
        public string? BillingZip { get; set; }
        public string? BillingCountry { get; set; }
        public int? PaymentId { get; set; }
    }

    public enum InvoiceStatus
    {
        Draft,
        Sent,
        Paid,
        Overdue,
        Cancelled,
        Refunded
    }
}
