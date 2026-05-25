using GymManagement.Core.DTOs.Retail;

namespace GymManagement.Core.Services.Retail
{
    public interface IInventoryService
    {
        Task<InventoryTransactionDto> RecordInwardAsync(CreateStockInwardDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<InventoryTransactionDto> RecordAdjustmentAsync(CreateStockAdjustmentDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<IReadOnlyList<InventoryTransactionDto>> GetTransactionsAsync(int productId, CancellationToken ct = default);
        Task<IReadOnlyList<InventoryAlertDto>> GetLowStockAlertsAsync(CancellationToken ct = default);
        Task<IReadOnlyList<InventoryAlertDto>> GetExpiryAlertsAsync(int daysAhead = 30, CancellationToken ct = default);
    }
}
