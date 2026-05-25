using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/reports")]
    [Authorize]
    [HasPermission(PermissionCodes.ViewPtReports)]
    public class PtReportsController : ControllerBase
    {
        private readonly IPtReportService _service;

        public PtReportsController(IPtReportService service) => _service = service;

        [HttpGet("revenue")]
        public async Task<ActionResult> Revenue([FromQuery] PTReportFilterDto filter, CancellationToken ct)
            => Ok(await _service.GetRevenueReportAsync(filter, ct));

        [HttpGet("utilization")]
        public async Task<ActionResult> Utilization([FromQuery] PTReportFilterDto filter, CancellationToken ct)
            => Ok(await _service.GetUtilizationReportAsync(filter, ct));

        [HttpGet("expired-packages")]
        public async Task<ActionResult> ExpiredPackages([FromQuery] PTReportFilterDto filter, CancellationToken ct)
            => Ok(await _service.GetExpiredPackagesAsync(filter, ct));

        [HttpGet("revenue/export/csv")]
        public async Task<IActionResult> ExportRevenueCsv([FromQuery] PTReportFilterDto filter, CancellationToken ct)
        {
            var bytes = await _service.ExportRevenueCsvAsync(filter, ct);
            return File(bytes, "text/csv", $"pt-revenue-{DateTime.UtcNow:yyyyMMdd}.csv");
        }
    }
}
