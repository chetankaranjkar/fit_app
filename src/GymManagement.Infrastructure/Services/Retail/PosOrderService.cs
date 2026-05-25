using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Core.Services.Retail;
using GymManagement.Domain.Entities.Retail;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Retail
{
    public sealed class PosOrderService : IPosOrderService
    {
        private readonly ApplicationDbContext _db;
        private readonly ICouponService _couponService;

        public PosOrderService(ApplicationDbContext db, ICouponService couponService)
        {
            _db = db;
            _couponService = couponService;
        }

        public async Task<IReadOnlyList<PosOrderDto>> GetAllAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
        {
            var query = _db.RetailPosOrders.AsNoTracking()
                .Include(o => o.Items)
                .Where(o => !o.IsDeleted);
            if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value);
            if (to.HasValue) query = query.Where(o => o.OrderDate <= to.Value);

            var list = await query.OrderByDescending(o => o.OrderDate).ToListAsync(ct);
            return list.Select(MapOrderToDto).ToList();
        }

        public async Task<PosOrderDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var o = await _db.RetailPosOrders.AsNoTracking()
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            return o == null ? null : MapOrderToDto(o);
        }

        public async Task<PosOrderDto> CreateOrderAsync(CreatePosOrderDto dto, int? cashierUserId, CancellationToken ct = default)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                throw new BadRequestException("Cart is empty.");

            // Group duplicates
            var grouped = dto.Items
                .GroupBy(i => i.ProductId)
                .Select(g => new CreatePosOrderItemDto
                {
                    ProductId = g.Key,
                    Quantity = g.Sum(x => x.Quantity),
                    UnitPrice = g.First().UnitPrice,
                    DiscountAmount = g.Sum(x => x.DiscountAmount),
                })
                .ToList();

            foreach (var item in grouped)
            {
                if (item.Quantity <= 0) throw new BadRequestException("Quantity must be > 0.");
                if (item.DiscountAmount < 0) throw new BadRequestException("Discount cannot be negative.");
            }

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                try
                {
                    // Lock-load products
                    var productIds = grouped.Select(i => i.ProductId).ToList();
                    var products = await _db.RetailProducts
                        .Where(p => productIds.Contains(p.Id) && !p.IsDeleted)
                        .ToDictionaryAsync(p => p.Id, ct);

                    foreach (var item in grouped)
                    {
                        if (!products.TryGetValue(item.ProductId, out var p))
                            throw new BadRequestException($"Product #{item.ProductId} not found.");
                        if (p.Status == ProductStatus.Discontinued)
                            throw new BadRequestException($"Product '{p.Name}' is discontinued.");
                        if (p.StockQuantity < item.Quantity)
                            throw new BadRequestException($"Insufficient stock for '{p.Name}'. Available: {p.StockQuantity}, requested: {item.Quantity}.");
                    }

                    // Build order header
                    var order = new PosOrder
                    {
                        OrderNumber = await GenerateOrderNumberAsync(ct),
                        OrderDate = DateTime.UtcNow,
                        CustomerUserId = dto.CustomerUserId,
                        CustomerName = dto.CustomerName?.Trim(),
                        CustomerPhone = dto.CustomerPhone?.Trim(),
                        DiscountAmount = Math.Max(0, dto.DiscountAmount),
                        PaymentMethod = dto.PaymentMethod,
                        PaymentReference = dto.PaymentReference?.Trim(),
                        Notes = dto.Notes?.Trim(),
                        Status = PosOrderStatus.Completed,
                        CashierUserId = cashierUserId,
                    };

                    decimal subtotal = 0, taxTotal = 0;
                    foreach (var item in grouped)
                    {
                        var p = products[item.ProductId];
                        var unitPrice = item.UnitPrice ?? p.SellingPrice;
                        var lineDiscount = item.DiscountAmount;
                        var lineSubtotal = Math.Max(0, (unitPrice * item.Quantity) - lineDiscount);
                        var lineTax = Math.Round(lineSubtotal * (p.GstPercent / 100m), 2);
                        var lineTotal = lineSubtotal + lineTax;

                        order.Items.Add(new PosOrderItem
                        {
                            ProductId = p.Id,
                            ProductName = p.Name,
                            Sku = p.Sku,
                            Quantity = item.Quantity,
                            UnitPrice = unitPrice,
                            GstPercent = p.GstPercent,
                            DiscountAmount = lineDiscount,
                            Subtotal = lineSubtotal,
                            TaxAmount = lineTax,
                            LineTotal = lineTotal,
                        });
                        subtotal += lineSubtotal;
                        taxTotal += lineTax;
                    }

                    order.Subtotal = subtotal;
                    order.TaxAmount = taxTotal;
                    var grossBeforeCoupon = Math.Max(0, subtotal + taxTotal - order.DiscountAmount);

                    // Apply coupon (server-side validation)
                    if (!string.IsNullOrWhiteSpace(dto.CouponCode))
                    {
                        var validation = await _couponService.ValidateAsync(new ValidateCouponRequest
                        {
                            CouponCode = dto.CouponCode,
                            MembershipPlanId = 0,
                            InvoiceAmount = grossBeforeCoupon,
                            UserId = dto.CustomerUserId ?? 0,
                            BranchId = null,
                        }, ct);
                        if (!validation.Valid)
                            throw new BadRequestException($"Coupon: {validation.Message}");

                        order.CouponCode = validation.CouponCode;
                        order.CouponDiscountAmount = validation.DiscountAmount;
                    }

                    order.TotalAmount = Math.Max(0, grossBeforeCoupon - order.CouponDiscountAmount);

                    await _db.RetailPosOrders.AddAsync(order, ct);
                    await _db.SaveChangesAsync(ct);

                    // Deduct stock + record inventory transactions
                    foreach (var item in grouped)
                    {
                        var p = products[item.ProductId];
                        p.StockQuantity -= item.Quantity;
                        if (p.StockQuantity == 0) p.Status = ProductStatus.OutOfStock;
                        p.UpdatedDate = DateTime.UtcNow;

                        await _db.RetailInventoryTransactions.AddAsync(new InventoryTransaction
                        {
                            ProductId = p.Id,
                            TransactionType = InventoryTransactionType.Sale,
                            Quantity = item.Quantity,
                            BalanceAfter = p.StockQuantity,
                            UnitPrice = item.UnitPrice ?? p.SellingPrice,
                            TransactionDate = DateTime.UtcNow,
                            ReferenceNumber = order.OrderNumber,
                            PosOrderId = order.Id,
                            PerformedByUserId = cashierUserId,
                        }, ct);
                    }
                    await _db.SaveChangesAsync(ct);

                    // Apply coupon usage record
                    if (!string.IsNullOrWhiteSpace(order.CouponCode) && order.CustomerUserId.HasValue)
                    {
                        // Look up coupon id via validation again (or skip — coupon usage requires membershipPaymentId)
                        // For retail POS we don't have a MembershipPayment, so we record usage with a synthetic 0 id is not ideal.
                        // Strategy: increment coupon usedCount manually here without creating a CouponUsage record (or extend ICouponService for retail).
                        var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.CouponCode == order.CouponCode && !c.IsDeleted, ct);
                        if (coupon != null)
                        {
                            coupon.UsedCount++;
                            coupon.UpdatedDate = DateTime.UtcNow;
                            await _db.SaveChangesAsync(ct);
                        }
                    }

                    await tx.CommitAsync(ct);
                }
                catch
                {
                    await tx.RollbackAsync(ct);
                    throw;
                }

                var refreshed = await GetLatestOrderAsync(ct);
                return refreshed!;
            });
        }

        private async Task<PosOrderDto?> GetLatestOrderAsync(CancellationToken ct)
        {
            var o = await _db.RetailPosOrders.AsNoTracking()
                .Include(x => x.Items)
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync(ct);
            return o == null ? null : MapOrderToDto(o);
        }

        public async Task<bool> CancelAsync(int orderId, int? performedByUserId, CancellationToken ct = default)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                var order = await _db.RetailPosOrders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted, ct);
                if (order == null) return false;
                if (order.Status == PosOrderStatus.Cancelled) return true;

                // Restore stock
                foreach (var item in order.Items)
                {
                    var p = await _db.RetailProducts.FirstOrDefaultAsync(x => x.Id == item.ProductId, ct);
                    if (p == null) continue;
                    p.StockQuantity += item.Quantity;
                    if (p.Status == ProductStatus.OutOfStock && p.StockQuantity > 0) p.Status = ProductStatus.Active;
                    p.UpdatedDate = DateTime.UtcNow;

                    await _db.RetailInventoryTransactions.AddAsync(new InventoryTransaction
                    {
                        ProductId = p.Id,
                        TransactionType = InventoryTransactionType.Return,
                        Quantity = item.Quantity,
                        BalanceAfter = p.StockQuantity,
                        UnitPrice = item.UnitPrice,
                        TransactionDate = DateTime.UtcNow,
                        ReferenceNumber = order.OrderNumber,
                        PosOrderId = order.Id,
                        PerformedByUserId = performedByUserId,
                        Notes = "Order cancelled — stock restored",
                    }, ct);
                }

                order.Status = PosOrderStatus.Cancelled;
                order.UpdatedDate = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return true;
            });
        }

        public async Task<PosDashboardDto> GetDashboardAsync(CancellationToken ct = default)
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var todayOrders = await _db.RetailPosOrders.AsNoTracking()
                .Where(o => !o.IsDeleted && o.Status == PosOrderStatus.Completed && o.OrderDate >= today)
                .ToListAsync(ct);
            var monthOrders = await _db.RetailPosOrders.AsNoTracking()
                .Where(o => !o.IsDeleted && o.Status == PosOrderStatus.Completed && o.OrderDate >= monthStart)
                .ToListAsync(ct);

            var lowStockCount = await _db.RetailProducts.AsNoTracking()
                .CountAsync(p => !p.IsDeleted && p.Status != ProductStatus.Discontinued && p.StockQuantity <= p.LowStockThreshold, ct);

            var expiringCutoff = today.AddDays(30);
            var expiringSoonCount = await _db.RetailProducts.AsNoTracking()
                .CountAsync(p => !p.IsDeleted && p.ExpiryDate != null && p.ExpiryDate.Value.Date <= expiringCutoff, ct);

            var topProducts = await _db.RetailPosOrderItems.AsNoTracking()
                .Where(i => !i.IsDeleted && i.Order.OrderDate >= monthStart && i.Order.Status == PosOrderStatus.Completed)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new TopProductDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    UnitsSold = g.Sum(i => i.Quantity),
                    Revenue = g.Sum(i => i.LineTotal),
                })
                .OrderByDescending(t => t.UnitsSold)
                .Take(5)
                .ToListAsync(ct);

            return new PosDashboardDto
            {
                TodaySales = todayOrders.Sum(o => o.TotalAmount),
                TodayOrders = todayOrders.Count,
                MonthSales = monthOrders.Sum(o => o.TotalAmount),
                MonthOrders = monthOrders.Count,
                LowStockCount = lowStockCount,
                ExpiringSoonCount = expiringSoonCount,
                TopProducts = topProducts,
            };
        }

        private async Task<string> GenerateOrderNumberAsync(CancellationToken ct)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"POS-{year}-";
            var last = await _db.RetailPosOrders
                .IgnoreQueryFilters()
                .Where(o => o.OrderNumber.StartsWith(prefix))
                .OrderByDescending(o => o.OrderNumber)
                .Select(o => o.OrderNumber)
                .FirstOrDefaultAsync(ct);
            var seq = 1;
            if (last != null && last.Length > prefix.Length && int.TryParse(last.AsSpan(prefix.Length), out var n))
                seq = n + 1;
            return $"{prefix}{seq:D6}";
        }

        private static PosOrderDto MapOrderToDto(PosOrder o) => new()
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            OrderDate = o.OrderDate,
            CustomerUserId = o.CustomerUserId,
            CustomerName = o.CustomerName,
            CustomerPhone = o.CustomerPhone,
            Subtotal = o.Subtotal,
            TaxAmount = o.TaxAmount,
            DiscountAmount = o.DiscountAmount,
            CouponDiscountAmount = o.CouponDiscountAmount,
            CouponCode = o.CouponCode,
            TotalAmount = o.TotalAmount,
            PaymentMethod = o.PaymentMethod,
            PaymentReference = o.PaymentReference,
            Status = o.Status,
            Notes = o.Notes,
            CashierUserId = o.CashierUserId,
            Items = o.Items.Where(i => !i.IsDeleted).Select(i => new PosOrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                Sku = i.Sku,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                GstPercent = i.GstPercent,
                DiscountAmount = i.DiscountAmount,
                Subtotal = i.Subtotal,
                TaxAmount = i.TaxAmount,
                LineTotal = i.LineTotal,
            }).ToList(),
        };
    }
}
