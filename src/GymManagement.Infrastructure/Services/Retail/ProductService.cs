using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.Retail;
using GymManagement.Domain.Entities.Retail;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Retail
{
    public sealed class ProductService : IProductService
    {
        private readonly ApplicationDbContext _db;

        public ProductService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<ProductDto>> SearchAsync(ProductSearchFilterDto filter, CancellationToken ct = default)
        {
            var query = _db.RetailProducts.AsNoTracking()
                .Include(p => p.Category)
                .Where(p => !p.IsDeleted);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var s = filter.Search.Trim().ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(s) ||
                    p.Sku.ToLower().Contains(s) ||
                    (p.Brand != null && p.Brand.ToLower().Contains(s)) ||
                    (p.Barcode != null && p.Barcode.Contains(s)));
            }
            if (filter.CategoryId.HasValue)
                query = query.Where(p => p.CategoryId == filter.CategoryId.Value);
            if (!string.IsNullOrWhiteSpace(filter.Brand))
                query = query.Where(p => p.Brand == filter.Brand);
            if (filter.Status.HasValue)
                query = query.Where(p => p.Status == filter.Status.Value);
            if (filter.LowStockOnly == true)
                query = query.Where(p => p.StockQuantity <= p.LowStockThreshold);

            var list = await query.OrderBy(p => p.Name).ToListAsync(ct);

            var now = DateTime.UtcNow.Date;
            var soonCutoff = now.AddDays(30);
            return list.Select(p => MapToDto(p, now, soonCutoff))
                .Where(d => filter.ExpiringSoonOnly != true || d.IsExpiringSoon || d.IsExpired)
                .ToList();
        }

        public async Task<ProductDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var p = await _db.RetailProducts.AsNoTracking()
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            return p == null ? null : MapToDto(p, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(30));
        }

        public async Task<ProductDto?> GetBySkuAsync(string sku, CancellationToken ct = default)
        {
            var p = await _db.RetailProducts.AsNoTracking()
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Sku == sku && !x.IsDeleted, ct);
            return p == null ? null : MapToDto(p, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(30));
        }

        public async Task<ProductDto?> GetByBarcodeAsync(string barcode, CancellationToken ct = default)
        {
            var p = await _db.RetailProducts.AsNoTracking()
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Barcode == barcode && !x.IsDeleted, ct);
            return p == null ? null : MapToDto(p, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(30));
        }

        public async Task<ProductDto> CreateAsync(CreateProductDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) throw new BadRequestException("Product name is required.");
            if (string.IsNullOrWhiteSpace(dto.Sku)) throw new BadRequestException("SKU is required.");

            var sku = dto.Sku.Trim().ToUpper();
            if (await _db.RetailProducts.AnyAsync(p => p.Sku == sku && !p.IsDeleted, ct))
                throw new BadRequestException($"SKU '{sku}' already exists.");

            if (!await _db.RetailProductCategories.AnyAsync(c => c.Id == dto.CategoryId && !c.IsDeleted, ct))
                throw new BadRequestException("Category not found.");

            if (dto.SellingPrice < 0 || dto.PurchasePrice < 0 || dto.Mrp < 0)
                throw new BadRequestException("Prices cannot be negative.");

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                var product = new Product
                {
                    Name = dto.Name.Trim(),
                    Description = dto.Description?.Trim(),
                    Sku = sku,
                    Barcode = dto.Barcode?.Trim(),
                    CategoryId = dto.CategoryId,
                    Brand = dto.Brand?.Trim(),
                    Flavor = dto.Flavor?.Trim(),
                    Size = dto.Size?.Trim(),
                    Unit = dto.Unit?.Trim(),
                    BatchNumber = dto.BatchNumber?.Trim(),
                    ManufacturingDate = dto.ManufacturingDate,
                    ExpiryDate = dto.ExpiryDate,
                    GstPercent = dto.GstPercent,
                    Mrp = dto.Mrp,
                    PurchasePrice = dto.PurchasePrice,
                    SellingPrice = dto.SellingPrice,
                    StockQuantity = Math.Max(0, dto.InitialStockQuantity),
                    LowStockThreshold = dto.LowStockThreshold,
                    ImageUrl = dto.ImageUrl,
                    VendorId = dto.VendorId,
                    Status = ProductStatus.Active,
                };

                await _db.RetailProducts.AddAsync(product, ct);
                await _db.SaveChangesAsync(ct);

                if (product.StockQuantity > 0)
                {
                    await _db.RetailInventoryTransactions.AddAsync(new InventoryTransaction
                    {
                        ProductId = product.Id,
                        TransactionType = InventoryTransactionType.Inward,
                        Quantity = product.StockQuantity,
                        BalanceAfter = product.StockQuantity,
                        UnitPrice = dto.PurchasePrice,
                        TransactionDate = DateTime.UtcNow,
                        ReferenceNumber = "INITIAL",
                        Notes = "Initial stock on product creation",
                        PerformedByUserId = performedByUserId,
                    }, ct);
                    await _db.SaveChangesAsync(ct);
                }

                await tx.CommitAsync(ct);
                await _db.Entry(product).Reference(p => p.Category).LoadAsync(ct);
                return MapToDto(product, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(30));
            });
        }

        public async Task<ProductDto?> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default)
        {
            var p = await _db.RetailProducts.Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (p == null) return null;

            if (dto.Name != null) p.Name = dto.Name.Trim();
            if (dto.Description != null) p.Description = dto.Description.Trim();
            if (dto.Barcode != null) p.Barcode = dto.Barcode.Trim();
            if (dto.CategoryId.HasValue)
            {
                if (!await _db.RetailProductCategories.AnyAsync(c => c.Id == dto.CategoryId.Value && !c.IsDeleted, ct))
                    throw new BadRequestException("Category not found.");
                p.CategoryId = dto.CategoryId.Value;
            }
            if (dto.Brand != null) p.Brand = dto.Brand.Trim();
            if (dto.Flavor != null) p.Flavor = dto.Flavor.Trim();
            if (dto.Size != null) p.Size = dto.Size.Trim();
            if (dto.Unit != null) p.Unit = dto.Unit.Trim();
            if (dto.BatchNumber != null) p.BatchNumber = dto.BatchNumber.Trim();
            if (dto.ManufacturingDate.HasValue) p.ManufacturingDate = dto.ManufacturingDate;
            if (dto.ExpiryDate.HasValue) p.ExpiryDate = dto.ExpiryDate;
            if (dto.GstPercent.HasValue) p.GstPercent = dto.GstPercent.Value;
            if (dto.Mrp.HasValue) p.Mrp = dto.Mrp.Value;
            if (dto.PurchasePrice.HasValue) p.PurchasePrice = dto.PurchasePrice.Value;
            if (dto.SellingPrice.HasValue) p.SellingPrice = dto.SellingPrice.Value;
            if (dto.LowStockThreshold.HasValue) p.LowStockThreshold = dto.LowStockThreshold.Value;
            if (dto.ImageUrl != null) p.ImageUrl = dto.ImageUrl;
            if (dto.Status.HasValue) p.Status = dto.Status.Value;
            if (dto.VendorId.HasValue) p.VendorId = dto.VendorId;

            p.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return MapToDto(p, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(30));
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var p = await _db.RetailProducts.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (p == null) return false;
            p.IsDeleted = true;
            p.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static ProductDto MapToDto(Product p, DateTime now, DateTime soonCutoff) => new()
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            Sku = p.Sku,
            Barcode = p.Barcode,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name,
            Brand = p.Brand,
            Flavor = p.Flavor,
            Size = p.Size,
            Unit = p.Unit,
            BatchNumber = p.BatchNumber,
            ManufacturingDate = p.ManufacturingDate,
            ExpiryDate = p.ExpiryDate,
            GstPercent = p.GstPercent,
            Mrp = p.Mrp,
            PurchasePrice = p.PurchasePrice,
            SellingPrice = p.SellingPrice,
            StockQuantity = p.StockQuantity,
            LowStockThreshold = p.LowStockThreshold,
            ImageUrl = p.ImageUrl,
            Status = p.Status,
            VendorId = p.VendorId,
            IsLowStock = p.StockQuantity <= p.LowStockThreshold,
            IsExpired = p.ExpiryDate.HasValue && p.ExpiryDate.Value.Date < now,
            IsExpiringSoon = p.ExpiryDate.HasValue && p.ExpiryDate.Value.Date >= now && p.ExpiryDate.Value.Date <= soonCutoff,
            CreatedDate = p.CreatedDate,
            UpdatedDate = p.UpdatedDate,
        };
    }
}
