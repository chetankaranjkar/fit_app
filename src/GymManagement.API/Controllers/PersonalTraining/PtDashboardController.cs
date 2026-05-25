using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/dashboard")]
    [Authorize]
    public class PtDashboardController : ControllerBase
    {
        private readonly IPtDashboardService _service;

        public PtDashboardController(IPtDashboardService service) => _service = service;

        [HttpGet("trainer/{trainerId:int}")]
        [HasPermission(PermissionCodes.ViewTrainerEarnings)]
        public async Task<ActionResult> TrainerDashboard(int trainerId, CancellationToken ct)
            => Ok(await _service.GetTrainerDashboardAsync(trainerId, ct));

        [HttpGet("admin-summary")]
        [HasPermission(PermissionCodes.ViewPtReports)]
        public async Task<ActionResult> AdminSummary(CancellationToken ct)
            => Ok(await _service.GetAdminSummaryAsync(ct));
    }
}
