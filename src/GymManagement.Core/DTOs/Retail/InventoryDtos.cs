using GymManagement.Domain.Entities.Retail;

namespace GymManagement.Core.DTOs.Retail
{
    public sealed class InventoryTransactionDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? Sku { get; set; }
        public InventoryTransactionType TransactionType { get; set; }
        public int Quantity { get; set; }
        public int BalanceAfter { get; set; }
        public decimal UnitPrice { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? ReferenceNumber { get; set; }
        public int? PosOrderId { get; set; }
        public string? Notes { get; set; }
    }

    public sealed class CreateStockInwardDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Notes { get; set; }
    }

    public sealed class CreateStockAdjustmentDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public InventoryTransactionType TransactionType { get; set; }
        public decimal? UnitPrice { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Notes { get; set; }
    }

    public sealed class InventoryAlertDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int StockQuantity { get; set; }
        public int LowStockThreshold { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public int? DaysToExpiry { get; set; }
        public string AlertType { get; set; } = string.Empty;
    }
}
