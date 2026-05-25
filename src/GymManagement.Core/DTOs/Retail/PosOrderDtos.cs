using GymManagement.Domain.Entities.Retail;

namespace GymManagement.Core.DTOs.Retail
{
    public sealed class PosOrderDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public int? CustomerUserId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal CouponDiscountAmount { get; set; }
        public string? CouponCode { get; set; }
        public decimal TotalAmount { get; set; }
        public PosPaymentMethod PaymentMethod { get; set; }
        public string? PaymentReference { get; set; }
        public PosOrderStatus Status { get; set; }
        public string? Notes { get; set; }
        public int? CashierUserId { get; set; }
        public string? CashierName { get; set; }
        public List<PosOrderItemDto> Items { get; set; } = new();
    }

    public sealed class PosOrderItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal GstPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LineTotal { get; set; }
    }

    public sealed class CreatePosOrderDto
    {
        public int? CustomerUserId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public decimal DiscountAmount { get; set; }
        public string? CouponCode { get; set; }
        public PosPaymentMethod PaymentMethod { get; set; } = PosPaymentMethod.Cash;
        public string? PaymentReference { get; set; }
        public string? Notes { get; set; }
        public List<CreatePosOrderItemDto> Items { get; set; } = new();
    }

    public sealed class CreatePosOrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        /// <summary>Override the default selling price (optional). Falls back to product's selling price.</summary>
        public decimal? UnitPrice { get; set; }
        /// <summary>Per-line discount (₹).</summary>
        public decimal DiscountAmount { get; set; }
    }

    public sealed class PosDashboardDto
    {
        public decimal TodaySales { get; set; }
        public int TodayOrders { get; set; }
        public decimal MonthSales { get; set; }
        public int MonthOrders { get; set; }
        public int LowStockCount { get; set; }
        public int ExpiringSoonCount { get; set; }
        public List<TopProductDto> TopProducts { get; set; } = new();
    }

    public sealed class TopProductDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int UnitsSold { get; set; }
        public decimal Revenue { get; set; }
    }
}
