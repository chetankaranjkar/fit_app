using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.Retail;
using GymManagement.Domain.Entities.Retail;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Retail
{
    public sealed class InventoryService : IInventoryService
    {
        private readonly ApplicationDbContext _db;

        public InventoryService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<InventoryTransactionDto> RecordInwardAsync(CreateStockInwardDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            if (dto.Quantity <= 0)
                throw new BadRequestException("Quantity must be greater than zero.");

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                var product = await _db.RetailProducts.FirstOrDefaultAsync(p => p.Id == dto.ProductId && !p.IsDeleted, ct)
                    ?? throw new NotFoundException("Product not found.");

                product.StockQuantity += dto.Quantity;
                if (product.Status == ProductStatus.OutOfStock && product.StockQuantity > 0)
                    product.Status = ProductStatus.Active;
                product.UpdatedDate = DateTime.UtcNow;

                var txRow = new InventoryTransaction
                {
                    ProductId = product.Id,
                    TransactionType = InventoryTransactionType.Inward,
                    Quantity = dto.Quantity,
                    BalanceAfter = product.StockQuantity,
                    UnitPrice = dto.UnitPrice,
                    TransactionDate = DateTime.UtcNow,
                    ReferenceNumber = dto.ReferenceNumber?.Trim(),
                    Notes = dto.Notes?.Trim(),
                    PerformedByUserId = performedByUserId,
                };
                await _db.RetailInventoryTransactions.AddAsync(txRow, ct);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return MapTx(txRow, product);
            });
        }

        public async Task<InventoryTransactionDto> RecordAdjustmentAsync(CreateStockAdjustmentDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            if (dto.Quantity <= 0)
                throw new BadRequestException("Quantity must be greater than zero.");

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                var product = await _db.RetailProducts.FirstOrDefaultAsync(p => p.Id == dto.ProductId && !p.IsDeleted, ct)
                    ?? throw new NotFoundException("Product not found.");

                int delta = dto.TransactionType switch
                {
                    InventoryTransactionType.Inward or InventoryTransactionType.Return => dto.Quantity,
                    InventoryTransactionType.Outward or InventoryTransactionType.Sale => -dto.Quantity,
                    InventoryTransactionType.Adjustment => dto.Quantity,
                    _ => 0,
                };

                if (product.StockQuantity + delta < 0)
                    throw new BadRequestException($"Insufficient stock. Available: {product.StockQuantity}.");

                product.StockQuantity += delta;
                if (product.StockQuantity == 0) product.Status = ProductStatus.OutOfStock;
                else if (product.Status == ProductStatus.OutOfStock) product.Status = ProductStatus.Active;
                product.UpdatedDate = DateTime.UtcNow;

                var txRow = new InventoryTransaction
                {
                    ProductId = product.Id,
                    TransactionType = dto.TransactionType,
                    Quantity = dto.Quantity,
                    BalanceAfter = product.StockQuantity,
                    UnitPrice = dto.UnitPrice ?? product.SellingPrice,
                    TransactionDate = DateTime.UtcNow,
                    ReferenceNumber = dto.ReferenceNumber?.Trim(),
                    Notes = dto.Notes?.Trim(),
                    PerformedByUserId = performedByUserId,
                };
                await _db.RetailInventoryTransactions.AddAsync(txRow, ct);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return MapTx(txRow, product);
            });
        }

        public async Task<IReadOnlyList<InventoryTransactionDto>> GetTransactionsAsync(int productId, CancellationToken ct = default)
        {
            var list = await _db.RetailInventoryTransactions.AsNoTracking()
                .Include(t => t.Product)
                .Where(t => t.ProductId == productId && !t.IsDeleted)
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync(ct);
            return list.Select(t => MapTx(t, t.Product)).ToList();
        }

        public async Task<IReadOnlyList<InventoryAlertDto>> GetLowStockAlertsAsync(CancellationToken ct = default)
        {
            var products = await _db.RetailProducts.AsNoTracking()
                .Where(p => !p.IsDeleted && p.Status != ProductStatus.Discontinued && p.StockQuantity <= p.LowStockThreshold)
                .OrderBy(p => p.StockQuantity)
                .ToListAsync(ct);
            return products.Select(p => new InventoryAlertDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                Sku = p.Sku,
                StockQuantity = p.StockQuantity,
                LowStockThreshold = p.LowStockThreshold,
                AlertType = p.StockQuantity == 0 ? "OutOfStock" : "LowStock",
            }).ToList();
        }

        public async Task<IReadOnlyList<InventoryAlertDto>> GetExpiryAlertsAsync(int daysAhead = 30, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow.Date;
            var cutoff = now.AddDays(daysAhead);
            var products = await _db.RetailProducts.AsNoTracking()
                .Where(p => !p.IsDeleted && p.ExpiryDate != null && p.ExpiryDate.Value.Date <= cutoff)
                .OrderBy(p => p.ExpiryDate)
                .ToListAsync(ct);
            return products.Select(p => new InventoryAlertDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                Sku = p.Sku,
                StockQuantity = p.StockQuantity,
                LowStockThreshold = p.LowStockThreshold,
                ExpiryDate = p.ExpiryDate,
                DaysToExpiry = p.ExpiryDate.HasValue ? (int)(p.ExpiryDate.Value.Date - now).TotalDays : null,
                AlertType = p.ExpiryDate.HasValue && p.ExpiryDate.Value.Date < now ? "Expired" : "ExpiringSoon",
            }).ToList();
        }

        private static InventoryTransactionDto MapTx(InventoryTransaction t, Product? p) => new()
        {
            Id = t.Id,
            ProductId = t.ProductId,
            ProductName = p?.Name,
            Sku = p?.Sku,
            TransactionType = t.TransactionType,
            Quantity = t.Quantity,
            BalanceAfter = t.BalanceAfter,
            UnitPrice = t.UnitPrice,
            TransactionDate = t.TransactionDate,
            ReferenceNumber = t.ReferenceNumber,
            PosOrderId = t.PosOrderId,
            Notes = t.Notes,
        };
    }
}
