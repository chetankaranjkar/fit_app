using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IInvoiceService
    {
        Task<IEnumerable<InvoiceDto>> GetAllAsync();
        Task<IEnumerable<InvoiceDto>> GetByMembershipIdAsync(int membershipId);
        Task<IEnumerable<InvoiceDto>> GetByUserIdAsync(int userId);
        Task<InvoiceDto?> GetByIdAsync(int id);
        Task<InvoiceDto?> GetByNumberAsync(string invoiceNumber);
        Task<InvoiceDto> CreateAsync(CreateInvoiceDto dto);
        Task<InvoiceDto?> UpdateAsync(int id, UpdateInvoiceDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> MarkAsPaidAsync(int id, int paymentId);
        Task<InvoiceDto?> GenerateInvoiceFromMembershipAsync(int membershipId, bool includeUnpaidOnly = true);
        /// <summary>Creates a paid tax invoice/receipt for a recorded payment (gym billing standard).</summary>
        Task<InvoiceDto?> CreatePaidInvoiceForPaymentAsync(int paymentId);
        /// <summary>Maps payment ids to invoice ids (for list/detail APIs).</summary>
        Task<Dictionary<int, int>> GetInvoiceIdsByPaymentIdsAsync(IEnumerable<int> paymentIds);
        Task<string> ExportToPdfAsync(int id); // Returns file path or base64
        Task<byte[]> GeneratePdfBytesAsync(int id);
    }
}
