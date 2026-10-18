using System.Text.Json;
using GymManagement.Core.Branching;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Domain.Entities.Retail;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class OperationalBranchService : IOperationalBranchService
{
    private readonly ApplicationDbContext _db;

    public OperationalBranchService(ApplicationDbContext db) => _db = db;

    public async Task<BranchDeactivationCounts> PreviewDeactivationAsync(int branchId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(branchId, cancellationToken);

        var occupying = new[]
        {
            MembershipStatus.Active,
            MembershipStatus.ActivePendingPayment,
            MembershipStatus.PartialPayment,
            MembershipStatus.Frozen,
        };
        var activeMembers = await _db.UserMemberships.CountAsync(m =>
            !m.IsDeleted
            && occupying.Contains(m.Status)
            && _db.Users.Any(u => u.Id == m.UserId && u.HomeBranchId == branchId),
            cancellationToken);
        var homeUsers = await _db.Users.CountAsync(u => u.HomeBranchId == branchId, cancellationToken);

        var extraStaff = await _db.UserBranchAssignments.CountAsync(a => a.BranchId == branchId, cancellationToken);
        var homeStaff = await _db.Users.CountAsync(u =>
            u.HomeBranchId == branchId
            && (_db.Staff.Any(s => s.UserId == u.Id) || _db.Trainers.Any(t => t.UserId == u.Id)),
            cancellationToken);

        var occupiedLockers = await _db.Set<Domain.Entities.LockerMgmt.Locker>()
            .CountAsync(l => l.BranchId == branchId && l.Status == "OCCUPIED", cancellationToken);
        var equipment = await _db.GymOpsEquipment.CountAsync(e => e.BranchId == branchId, cancellationToken);
        var stock = await _db.RetailBranchStocks.CountAsync(s => s.BranchId == branchId && s.Quantity > 0, cancellationToken);
        var bookings = await _db.PTSessions.CountAsync(s =>
            s.BranchId == branchId && (s.Status == PTSessionStatus.Booked || s.Status == PTSessionStatus.Rescheduled),
            cancellationToken);
        var membershipBills = await _db.MembershipPayments.CountAsync(p =>
            p.SellingBranchId == branchId
            && (p.PaymentStatus == MembershipPaymentStatus.Pending
                || p.PaymentStatus == MembershipPaymentStatus.Partial
                || p.PaymentStatus == MembershipPaymentStatus.Overdue),
            cancellationToken);
        var ptBills = await _db.PTPackageInvoices.CountAsync(i =>
            i.SellingBranchId == branchId
            && (i.PaymentStatus == PTPaymentStatus.Pending || i.PaymentStatus == PTPaymentStatus.Partial),
            cancellationToken);

        return new BranchDeactivationCounts
        {
            ActiveMembers = activeMembers,
            HomeUsers = homeUsers,
            StaffAssignments = extraStaff + homeStaff,
            OccupiedLockers = occupiedLockers,
            EquipmentAssets = equipment,
            StockOnHand = stock,
            OpenBookings = bookings,
            OutstandingBills = membershipBills + ptBills,
        };
    }

    public async Task TransferEquipmentAsync(
        int equipmentId, int toBranchId, DateTime effectiveDate, string reason, int actingUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A transfer reason is required.");
        await EnsureBranchAsync(toBranchId, cancellationToken);
        var asset = await _db.GymOpsEquipment.FirstOrDefaultAsync(e => e.Id == equipmentId, cancellationToken)
            ?? throw new InvalidOperationException("Equipment was not found.");
        var from = asset.BranchId;
        if (from == toBranchId)
            throw new InvalidOperationException("The asset is already at that branch.");

        asset.BranchId = toBranchId;
        _db.GymOpsEquipmentTransfers.Add(new EquipmentTransfer
        {
            EquipmentId = asset.Id,
            FromBranchId = from,
            ToBranchId = toBranchId,
            EffectiveDate = effectiveDate,
            Reason = reason.Trim(),
            ActingUserId = actingUserId,
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task TransferLockerAsync(
        int lockerId, int toBranchId, DateTime effectiveDate, string reason, int actingUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A transfer reason is required.");
        await EnsureBranchAsync(toBranchId, cancellationToken);
        var locker = await _db.LockerMgmtLockers.FirstOrDefaultAsync(l => l.Id == lockerId && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Locker was not found.");
        if (locker.BranchId == toBranchId)
            throw new InvalidOperationException("The locker is already at that branch.");
        var occupied = await _db.LockerMgmtAssignments.AnyAsync(a => a.LockerId == lockerId && !a.IsDeleted, cancellationToken);
        if (occupied)
            throw new InvalidOperationException("Release the locker before moving it. Past allocations keep their original branch.");
        var numberTaken = await _db.LockerMgmtLockers.AnyAsync(
            l => l.Id != lockerId && !l.IsDeleted && l.BranchId == toBranchId && l.LockerNumber == locker.LockerNumber,
            cancellationToken);
        if (numberTaken)
            throw new InvalidOperationException("That locker number is already used at the destination branch.");

        var from = locker.BranchId;
        locker.BranchId = toBranchId;
        _db.LockerMgmtTransfers.Add(new LockerTransfer
        {
            LockerId = locker.Id,
            FromBranchId = from,
            ToBranchId = toBranchId,
            EffectiveDate = effectiveDate,
            Reason = reason.Trim(),
            ActingUserId = actingUserId,
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task TransferStockAsync(
        int productId, int fromBranchId, int toBranchId, int quantity, DateTime effectiveDate, string reason, int actingUserId, CancellationToken cancellationToken = default)
    {
        if (fromBranchId == toBranchId)
            throw new ArgumentException("Choose two different branches.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A transfer reason is required.");
        await EnsureBranchAsync(fromBranchId, cancellationToken);
        await EnsureBranchAsync(toBranchId, cancellationToken);
        var product = await _db.RetailProducts.FirstOrDefaultAsync(p => p.Id == productId, cancellationToken)
            ?? throw new InvalidOperationException("Product was not found.");

        var source = await _db.RetailBranchStocks.FirstOrDefaultAsync(s => s.ProductId == productId && s.BranchId == fromBranchId, cancellationToken)
            ?? throw new InvalidOperationException("The source branch has no stock row for this product.");
        var destination = await _db.RetailBranchStocks.FirstOrDefaultAsync(s => s.ProductId == productId && s.BranchId == toBranchId, cancellationToken);
        if (destination == null)
        {
            destination = new BranchStock { ProductId = productId, BranchId = toBranchId, Quantity = 0, ReorderLevel = source.ReorderLevel };
            _db.RetailBranchStocks.Add(destination);
        }

        source.Quantity = OperationalBranchRules.StockAfterTransfer(source.Quantity, quantity);
        destination.Quantity += quantity;

        var now = DateTime.UtcNow;
        _db.RetailStockTransfers.Add(new StockTransfer
        {
            ProductId = product.Id,
            FromBranchId = fromBranchId,
            ToBranchId = toBranchId,
            Quantity = quantity,
            EffectiveDate = effectiveDate,
            Reason = reason.Trim(),
            ActingUserId = actingUserId,
        });
        _db.RetailInventoryTransactions.Add(Ledger(product.Id, fromBranchId, InventoryTransactionType.Outward, quantity, source.Quantity, actingUserId, now, "Stock transfer out"));
        _db.RetailInventoryTransactions.Add(Ledger(product.Id, toBranchId, InventoryTransactionType.Inward, quantity, destination.Quantity, actingUserId, now, "Stock transfer in"));
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetPackageBranchPriceAsync(int packageId, int branchId, decimal price, bool isAvailable, CancellationToken cancellationToken = default)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.");
        var packageExists = await _db.PTPackages.AnyAsync(p => p.Id == packageId, cancellationToken);
        if (!packageExists)
            throw new InvalidOperationException("PT package was not found.");
        await EnsureBranchAsync(branchId, cancellationToken);

        var row = await _db.PTPackageBranchPrices.FirstOrDefaultAsync(p => p.PackageId == packageId && p.BranchId == branchId, cancellationToken);
        if (row == null)
        {
            _db.PTPackageBranchPrices.Add(new PTPackageBranchPrice
            {
                PackageId = packageId,
                BranchId = branchId,
                Price = price,
                IsAvailable = isAvailable,
            });
        }
        else
        {
            row.Price = price;
            row.IsAvailable = isAvailable;
            row.UpdatedDate = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(cancellationToken);
    }

    public static string Snapshot(BranchDeactivationCounts counts) => JsonSerializer.Serialize(counts);

    private async Task EnsureBranchAsync(int branchId, CancellationToken cancellationToken)
    {
        var exists = await _db.Branches.AnyAsync(b => b.Id == branchId, cancellationToken);
        if (!exists)
            throw new InvalidOperationException("Branch was not found.");
    }

    private static InventoryTransaction Ledger(int productId, int branchId, InventoryTransactionType type, int quantity, int balance, int actorId, DateTime when, string notes) =>
        new()
        {
            ProductId = productId,
            BranchId = branchId,
            TransactionType = type,
            Quantity = quantity,
            BalanceAfter = balance,
            TransactionDate = when,
            PerformedByUserId = actorId,
            Notes = notes,
        };
}
