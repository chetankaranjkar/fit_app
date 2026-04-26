namespace GymManagement.Core.DTOs.GymOps
{
    public class ExpenseDto
    {
        public int Id { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string PaymentStatus { get; set; } = "PAID";
        public string? Vendor { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateExpenseDto
    {
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string PaymentStatus { get; set; } = "PAID";
        public string? Vendor { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateExpenseDto
    {
        public string? Category { get; set; }
        public string? Description { get; set; }
        public decimal? Amount { get; set; }
        public DateTime? ExpenseDate { get; set; }
        public string? PaymentStatus { get; set; }
        public string? Vendor { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? Notes { get; set; }
    }
}
