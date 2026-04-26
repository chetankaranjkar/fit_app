using System.ComponentModel.DataAnnotations;

namespace GymManagement.Core.DTOs
{
    public class InvoiceItemDto
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = "hours";
        public decimal UnitPrice { get; set; }
        public decimal Total { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateInvoiceItemDto
    {
        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Quantity { get; set; }

        [Required]
        public string Unit { get; set; } = "hours";

        [Required]
        public decimal UnitPrice { get; set; }

        public string? Notes { get; set; }
    }

    public class UpdateInvoiceItemDto
    {
        public string? Description { get; set; }
        public decimal? Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal? UnitPrice { get; set; }
        public string? Notes { get; set; }
    }
}