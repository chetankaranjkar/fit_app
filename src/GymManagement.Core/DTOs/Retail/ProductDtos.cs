using GymManagement.Domain.Entities.Retail;

namespace GymManagement.Core.DTOs.Retail
{
    public sealed class ProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? Brand { get; set; }
        public string? Flavor { get; set; }
        public string? Size { get; set; }
        public string? Unit { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public decimal GstPercent { get; set; }
        public decimal Mrp { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SellingPrice { get; set; }
        public int StockQuantity { get; set; }
        public int LowStockThreshold { get; set; }
        public string? ImageUrl { get; set; }
        public ProductStatus Status { get; set; }
        public int? VendorId { get; set; }
        public bool IsLowStock { get; set; }
        public bool IsExpired { get; set; }
        public bool IsExpiringSoon { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
    }

    public sealed class CreateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public int CategoryId { get; set; }
        public string? Brand { get; set; }
        public string? Flavor { get; set; }
        public string? Size { get; set; }
        public string? Unit { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public decimal GstPercent { get; set; }
        public decimal Mrp { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SellingPrice { get; set; }
        public int InitialStockQuantity { get; set; }
        public int LowStockThreshold { get; set; } = 5;
        public string? ImageUrl { get; set; }
        public int? VendorId { get; set; }
    }

    public sealed class UpdateProductDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Barcode { get; set; }
        public int? CategoryId { get; set; }
        public string? Brand { get; set; }
        public string? Flavor { get; set; }
        public string? Size { get; set; }
        public string? Unit { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public decimal? GstPercent { get; set; }
        public decimal? Mrp { get; set; }
        public decimal? PurchasePrice { get; set; }
        public decimal? SellingPrice { get; set; }
        public int? LowStockThreshold { get; set; }
        public string? ImageUrl { get; set; }
        public ProductStatus? Status { get; set; }
        public int? VendorId { get; set; }
    }

    public sealed class ProductSearchFilterDto
    {
        public string? Search { get; set; }
        public int? CategoryId { get; set; }
        public string? Brand { get; set; }
        public ProductStatus? Status { get; set; }
        public bool? LowStockOnly { get; set; }
        public bool? ExpiringSoonOnly { get; set; }
    }
}
