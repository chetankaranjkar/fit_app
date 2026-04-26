namespace GymManagement.Domain.Entities.GymOps
{
    public class Expense : BaseEntity
    {
        public string Category { get; set; } = string.Empty; // UTILITIES / RENT / SALARIES / SUPPLIES / MAINTENANCE / MARKETING / OTHER
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string PaymentStatus { get; set; } = "PAID"; // PAID / PENDING / OVERDUE
        public string? Vendor { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? Notes { get; set; }
    }
}
