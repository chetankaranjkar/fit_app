using GymManagement.Core.Branching;

namespace GymManagement.Core.Services;

public interface IOperationalBranchService
{
    Task<BranchDeactivationCounts> PreviewDeactivationAsync(int branchId, CancellationToken cancellationToken = default);

    Task TransferEquipmentAsync(int equipmentId, int toBranchId, DateTime effectiveDate, string reason, int actingUserId, CancellationToken cancellationToken = default);

    Task TransferLockerAsync(int lockerId, int toBranchId, DateTime effectiveDate, string reason, int actingUserId, CancellationToken cancellationToken = default);

    Task TransferStockAsync(int productId, int fromBranchId, int toBranchId, int quantity, DateTime effectiveDate, string reason, int actingUserId, CancellationToken cancellationToken = default);

    Task SetPackageBranchPriceAsync(int packageId, int branchId, decimal price, bool isAvailable, CancellationToken cancellationToken = default);
}
