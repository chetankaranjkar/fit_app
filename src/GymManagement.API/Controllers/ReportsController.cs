using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.Reports)]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ReportSummaryDto>> GetSummary([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var result = await _reportService.GetSummaryAsync(fromDate, toDate);
            return Ok(result);
        }

        [HttpGet("summary/export/csv")]
        public async Task<IActionResult> ExportSummaryCsv([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var bytes = await _reportService.ExportSummaryCsvAsync(fromDate, toDate);
            var fileName = $"dashboard-report-{fromDate:yyyyMMdd}-{toDate:yyyyMMdd}.csv";
            return File(bytes, "text/csv", fileName);
        }

        [HttpGet("summary/export/xls")]
        public async Task<IActionResult> ExportSummaryXls([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var bytes = await _reportService.ExportSummaryXlsAsync(fromDate, toDate);
            var fileName = $"dashboard-report-{fromDate:yyyyMMdd}-{toDate:yyyyMMdd}.xls";
            return File(bytes, "application/vnd.ms-excel", fileName);
        }

        [HttpGet("payments/export/csv")]
        public async Task<IActionResult> ExportPaymentsCsv([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var bytes = await _reportService.ExportPaymentsCsvAsync(fromDate, toDate);
            var fileName = $"payments-{fromDate:yyyyMMdd}-{toDate:yyyyMMdd}.csv";
            return File(bytes, "text/csv", fileName);
        }

        [HttpGet("payments/export/xls")]
        public async Task<IActionResult> ExportPaymentsXls([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            var bytes = await _reportService.ExportPaymentsXlsAsync(fromDate, toDate);
            var fileName = $"payments-{fromDate:yyyyMMdd}-{toDate:yyyyMMdd}.xls";
            return File(bytes, "application/vnd.ms-excel", fileName);
        }
    }
}

