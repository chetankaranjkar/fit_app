namespace GymManagement.Domain.Entities.Retail
{
    public enum ProductStatus
    {
        Active,
        Discontinued,
        OutOfStock,
    }

    /// <summary>
    /// Retail product (supplements, accessories, apparel, etc.).
    /// Distinct from internal gym equipment (GymOps_Equipment).
    /// </summary>
    public class Product : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>Stock Keeping Unit — unique business identifier.</summary>
        public string Sku { get; set; } = string.Empty;

        /// <summary>Optional barcode/EAN/UPC.</summary>
        public string? Barcode { get; set; }

        public int CategoryId { get; set; }

        public string? Brand { get; set; }

        /// <summary>Free-form attribute (e.g. Chocolate, Vanilla, Cookies & Cream).</summary>
        public string? Flavor { get; set; }

        /// <summary>Free-form attribute (e.g. 1kg, 500g, 30 servings, M, L, XL).</summary>
        public string? Size { get; set; }

        public string? Unit { get; set; }

        /// <summary>Manufacturer batch / lot number.</summary>
        public string? BatchNumber { get; set; }

        public DateTime? ManufacturingDate { get; set; }
        public DateTime? ExpiryDate { get; set; }

        /// <summary>GST percentage (e.g. 5, 12, 18).</summary>
        public decimal GstPercent { get; set; }

        /// <summary>Maximum Retail Price (printed on the pack).</summary>
        public decimal Mrp { get; set; }

        /// <summary>Cost price (what we paid the vendor).</summary>
        public decimal PurchasePrice { get; set; }

        /// <summary>Default selling price.</summary>
        public decimal SellingPrice { get; set; }

        /// <summary>Current on-hand stock. Maintained by inventory transactions.</summary>
        public int StockQuantity { get; set; }

        /// <summary>Threshold below which a low-stock alert is raised.</summary>
        public int LowStockThreshold { get; set; } = 5;

        /// <summary>Optional product image URL.</summary>
        public string? ImageUrl { get; set; }

        public ProductStatus Status { get; set; } = ProductStatus.Active;

        public int? VendorId { get; set; }

        public int? OrganizationId { get; set; }

        // Navigation
        public ProductCategory Category { get; set; } = null!;
        public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();
    }
}
