namespace GymManagement.Domain.Entities.Retail
{
    /// <summary>
    /// Line item in a <see cref="PosOrder"/>. All values are snapshotted at sale time
    /// so historical orders are not affected by future product price changes.
    /// </summary>
    public class PosOrderItem : BaseEntity
    {
        public int OrderId { get; set; }
        public int ProductId { get; set; }

        /// <summary>Product name snapshot.</summary>
        public string ProductName { get; set; } = string.Empty;

        /// <summary>SKU snapshot.</summary>
        public string Sku { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal GstPercent { get; set; }

        /// <summary>Per-line discount (₹).</summary>
        public decimal DiscountAmount { get; set; }

        /// <summary>Subtotal = (UnitPrice × Quantity) − DiscountAmount.</summary>
        public decimal Subtotal { get; set; }

        /// <summary>Tax on this line.</summary>
        public decimal TaxAmount { get; set; }

        /// <summary>Final line total = Subtotal + TaxAmount.</summary>
        public decimal LineTotal { get; set; }

        // Navigation
        public PosOrder Order { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }
}
