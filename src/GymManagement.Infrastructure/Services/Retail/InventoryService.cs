using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Core.Services.Retail;
using GymManagement.Domain.Entities.Retail;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Retail
{
    public sealed class InventoryService : IInventoryService
    {
        private readonly ApplicationDbContext _db;
        private readonly IBranchScopeService _scope;

        public InventoryService(ApplicationDbContext db, IBranchScopeService scope)
        {
            _db = db;
            _scope = scope;
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
                var branchId = await ResolveStockBranchAsync(dto.BranchId, ct);

                int balance;
                if (branchId is int stockBranchId)
                {
                    var row = await GetOrCreateBranchStockAsync(product.Id, stockBranchId, ct);
                    row.Quantity += dto.Quantity;
                    balance = row.Quantity;
                }
                else
                {
                    product.StockQuantity += dto.Quantity;
                    if (product.Status == ProductStatus.OutOfStock && product.StockQuantity > 0)
                        product.Status = ProductStatus.Active;
                    balance = product.StockQuantity;
                }
                product.UpdatedDate = DateTime.UtcNow;

                var txRow = new InventoryTransaction
                {
                    ProductId = product.Id,
                    TransactionType = InventoryTransactionType.Inward,
                    Quantity = dto.Quantity,
                    BalanceAfter = balance,
                    UnitPrice = dto.UnitPrice,
                    TransactionDate = DateTime.UtcNow,
                    ReferenceNumber = dto.ReferenceNumber?.Trim(),
                    Notes = dto.Notes?.Trim(),
                    PerformedByUserId = performedByUserId,
                    BranchId = branchId,
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
                var branchId = await ResolveStockBranchAsync(dto.BranchId, ct);

                int delta = dto.TransactionType switch
                {
                    InventoryTransactionType.Inward or InventoryTransactionType.Return => dto.Quantity,
                    InventoryTransactionType.Outward or InventoryTransactionType.Sale => -dto.Quantity,
                    InventoryTransactionType.Adjustment => dto.Quantity,
                    _ => 0,
                };

                int balance;

                if (branchId is int stockBranchId)
                {
                    var row = await GetOrCreateBranchStockAsync(product.Id, stockBranchId, ct);
                    if (row.Quantity + delta < 0)
                        throw new BadRequestException($"Insufficient branch stock. Available: {row.Quantity}.");
                    row.Quantity += delta;
                    balance = row.Quantity;
                }
                else
                {
                    if (product.StockQuantity + delta < 0)
                        throw new BadRequestException($"Insufficient stock. Available: {product.StockQuantity}.");
                    product.StockQuantity += delta;
                    if (product.StockQuantity == 0) product.Status = ProductStatus.OutOfStock;
                    else if (product.Status == ProductStatus.OutOfStock) product.Status = ProductStatus.Active;
                    balance = product.StockQuantity;
                }
                product.UpdatedDate = DateTime.UtcNow;

                var txRow = new InventoryTransaction
                {
                    ProductId = product.Id,
                    TransactionType = dto.TransactionType,
                    Quantity = dto.Quantity,
                    BalanceAfter = balance,
                    UnitPrice = dto.UnitPrice ?? product.SellingPrice,
                    TransactionDate = DateTime.UtcNow,
                    ReferenceNumber = dto.ReferenceNumber?.Trim(),
                    Notes = dto.Notes?.Trim(),
                    PerformedByUserId = performedByUserId,
                    BranchId = branchId,
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
            var scope = await _scope.CurrentAsync(ct);
            return list.Where(t => scope.Includes(t.BranchId)).Select(t => MapTx(t, t.Product)).ToList();
        }

        public async Task<IReadOnlyList<InventoryAlertDto>> GetLowStockAlertsAsync(CancellationToken ct = default)
        {
            var scope = await _scope.CurrentAsync(ct);
            if (!scope.IsUnrestricted)
            {
                var ids = scope.BranchIds.ToArray();
                var rows = await _db.RetailBranchStocks.AsNoTracking()
                    .Include(s => s.Product)
                    .Where(s => ids.Contains(s.BranchId) && !s.Product.IsDeleted && s.Product.Status != ProductStatus.Discontinued && s.Quantity <= s.ReorderLevel)
                    .OrderBy(s => s.Quantity)
                    .ToListAsync(ct);
                return rows.Select(s => new InventoryAlertDto
                {
                    ProductId = s.ProductId,
                    ProductName = s.Product.Name,
                    Sku = s.Product.Sku,
                    StockQuantity = s.Quantity,
                    LowStockThreshold = s.ReorderLevel,
                    AlertType = s.Quantity == 0 ? "OutOfStock" : "LowStock",
                }).ToList();
            }

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

        private async Task<int?> ResolveStockBranchAsync(int? requestedBranchId, CancellationToken ct)
        {
            var scope = await _scope.CurrentAsync(ct);
            if (!requestedBranchId.HasValue && scope.IsUnrestricted)
                return null;
            return (await _scope.RequireAssignableBranchAsync(requestedBranchId, null, ct)).BranchId;
        }

        private async Task<BranchStock> GetOrCreateBranchStockAsync(int productId, int branchId, CancellationToken ct)
        {
            var row = await _db.RetailBranchStocks.FirstOrDefaultAsync(s => s.ProductId == productId && s.BranchId == branchId, ct);
            if (row != null) return row;
            row = new BranchStock { ProductId = productId, BranchId = branchId };
            _db.RetailBranchStocks.Add(row);
            return row;
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
