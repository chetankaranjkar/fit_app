using GymManagement.Core.DTOs.Retail;

namespace GymManagement.Core.Services.Retail
{
    public interface IPosOrderService
    {
        Task<IReadOnlyList<PosOrderDto>> GetAllAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
        Task<PosOrderDto?> GetByIdAsync(int id, CancellationToken ct = default);

        /// <summary>
        /// Atomically creates a POS order, deducts stock from each product,
        /// records inventory transactions, and applies any coupon (validates server-side).
        /// </summary>
        Task<PosOrderDto> CreateOrderAsync(CreatePosOrderDto dto, int? cashierUserId, CancellationToken ct = default);

        Task<bool> CancelAsync(int orderId, int? performedByUserId, CancellationToken ct = default);

        Task<PosDashboardDto> GetDashboardAsync(CancellationToken ct = default);
    }
}
