using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IWaiveOffRequestService
    {
        Task<WaiveOffRequestDto> CreateAsync(CreateWaiveOffRequestDto dto, int requestedByUserId, CancellationToken ct = default);
        Task<WaiveOffRequestDto> ApproveAsync(int id, int approvedByUserId, CancellationToken ct = default);
        Task<WaiveOffRequestDto> RejectAsync(int id, int rejectedByUserId, RejectWaiveOffRequestDto dto, CancellationToken ct = default);
        Task<IReadOnlyList<WaiveOffRequestDto>> ListAsync(WaiveOffRequestStatusFilter? status, CancellationToken ct = default);
        Task<WaiveOffRequestDto?> GetByIdAsync(int id, CancellationToken ct = default);
    }

    public enum WaiveOffRequestStatusFilter
    {
        Pending,
        Approved,
        Rejected,
        All,
    }
}
