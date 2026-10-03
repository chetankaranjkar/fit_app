using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Infrastructure.Data;
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
        private readonly ApplicationDbContext _db;

        public PtDashboardController(IPtDashboardService service, ApplicationDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet("trainer/{trainerId:int}")]
        [HasPermission(PermissionCodes.ViewTrainerEarnings)]
        public async Task<ActionResult> TrainerDashboard(int trainerId, CancellationToken ct)
        {
            if (!await UserDirectoryScope.CanAccessTrainerProfileAsync(HttpContext, _db, trainerId, ct))
                return Forbid();
            return Ok(await _service.GetTrainerDashboardAsync(trainerId, ct));
        }

        [HttpGet("admin-summary")]
        [HasPermission(PermissionCodes.ViewPtReports)]
        public async Task<ActionResult> AdminSummary(CancellationToken ct)
            => Ok(await _service.GetAdminSummaryAsync(ct));
    }
}
