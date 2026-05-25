namespace GymManagement.Domain.Entities.Retail
{
    public enum InventoryTransactionType
    {
        /// <summary>Stock received from vendor / adjustment in.</summary>
        Inward,
        /// <summary>Stock sold via POS.</summary>
        Sale,
        /// <summary>Stock manually adjusted out (damage, loss, return to vendor).</summary>
        Outward,
        /// <summary>Stock corrected by audit / cycle count.</summary>
        Adjustment,
        /// <summary>Stock returned by customer.</summary>
        Return,
    }

    /// <summary>
    /// Immutable ledger of every stock movement for a retail product.
    /// Stock-on-hand is recomputed by summing these rows; <see cref="Product.StockQuantity"/>
    /// is a denormalised cache that is kept in sync inside transactions.
    /// </summary>
    public class InventoryTransaction : BaseEntity
    {
        public int ProductId { get; set; }

        public InventoryTransactionType TransactionType { get; set; }

        /// <summary>Positive integer — direction is implied by <see cref="TransactionType"/>.</summary>
        public int Quantity { get; set; }

        /// <summary>Stock balance after this transaction (snapshot, useful for audits).</summary>
        public int BalanceAfter { get; set; }

        /// <summary>Cost or sell unit price at the time of the transaction.</summary>
        public decimal UnitPrice { get; set; }

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

        /// <summary>External reference — vendor invoice no., POS order id, audit ref, etc.</summary>
        public string? ReferenceNumber { get; set; }

        public int? PosOrderId { get; set; }

        public int? PerformedByUserId { get; set; }

        public string? Notes { get; set; }

        // Navigation
        public Product Product { get; set; } = null!;
        public PosOrder? PosOrder { get; set; }
    }
}
