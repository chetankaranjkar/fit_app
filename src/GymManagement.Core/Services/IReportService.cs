using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IReportService
    {
        Task<ReportSummaryDto> GetSummaryAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportSummaryCsvAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportSummaryXlsAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportPaymentsCsvAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportPaymentsXlsAsync(DateTime fromDate, DateTime toDate);
    }
}

