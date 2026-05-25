namespace GymManagement.Domain.Entities.Retail
{
    public enum PosOrderStatus
    {
        Draft,
        Completed,
        Cancelled,
        Refunded,
    }

    public enum PosPaymentMethod
    {
        Cash,
        Upi,
        Card,
        Online,
        Wallet,
        Other,
    }

    /// <summary>
    /// Header for a retail POS sale. Independent of membership invoices.
    /// </summary>
    public class PosOrder : BaseEntity
    {
        /// <summary>Human-readable order number (e.g. POS-2026-000123).</summary>
        public string OrderNumber { get; set; } = string.Empty;

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        /// <summary>Optional gym member buying the product. Walk-in buyers leave this null.</summary>
        public int? CustomerUserId { get; set; }

        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }

        // ── Money ──
        /// <summary>Sum of (line item subtotal before tax/discount).</summary>
        public decimal Subtotal { get; set; }

        /// <summary>Total GST across all line items.</summary>
        public decimal TaxAmount { get; set; }

        /// <summary>Manual discount applied at order level.</summary>
        public decimal DiscountAmount { get; set; }

        /// <summary>Coupon discount applied at order level (if any).</summary>
        public decimal CouponDiscountAmount { get; set; }

        public string? CouponCode { get; set; }

        /// <summary>Final amount the customer pays = Subtotal + Tax − Discount − Coupon.</summary>
        public decimal TotalAmount { get; set; }

        public PosPaymentMethod PaymentMethod { get; set; } = PosPaymentMethod.Cash;

        public string? PaymentReference { get; set; }

        public PosOrderStatus Status { get; set; } = PosOrderStatus.Completed;

        public string? Notes { get; set; }

        public int? CashierUserId { get; set; }

        public int? OrganizationId { get; set; }

        // Navigation
        public ICollection<PosOrderItem> Items { get; set; } = new List<PosOrderItem>();
        public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
    }
}
