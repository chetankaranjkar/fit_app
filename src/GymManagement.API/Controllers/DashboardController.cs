using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.Reports)]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("statistics")]
        public async Task<ActionResult<DashboardStatisticsDto>> GetStatistics()
        {
            var statistics = await _dashboardService.GetStatisticsAsync();
            return Ok(statistics);
        }

        [HttpGet("notifications")]
        public async Task<ActionResult<DashboardNotificationsDto>> GetNotifications()
        {
            var notifications = await _dashboardService.GetNotificationsAsync();
            return Ok(notifications);
        }
    }
}

