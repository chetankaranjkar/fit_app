using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IPaymentService
    {
        Task<IEnumerable<PaymentDto>> GetAllAsync();
        Task<IEnumerable<PaymentDto>> GetByMembershipIdAsync(int membershipId);
        Task<PaymentDto?> GetByIdAsync(int id);
        Task<PaymentDto?> EnsureInvoiceAsync(int id);
        Task<PaymentDto> CreateAsync(CreatePaymentDto dto);
        Task<PaymentDto?> UpdateAsync(int id, UpdatePaymentDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
