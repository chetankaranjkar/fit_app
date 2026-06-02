using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;

namespace GymManagement.Core.Services
{
    public interface IPaymentService
    {
        Task<PagedResultDto<PaymentDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? sortBy = null,
            string? sortDir = null);

        Task<IEnumerable<PaymentDto>> GetAllAsync();
        Task<IEnumerable<PaymentDto>> GetByMembershipIdAsync(int membershipId);
        Task<PaymentDto?> GetByIdAsync(int id);
        Task<PaymentDto?> EnsureInvoiceAsync(int id);
        Task<PaymentDto> CreateAsync(CreatePaymentDto dto);
        Task<PaymentDto?> UpdateAsync(int id, UpdatePaymentDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
