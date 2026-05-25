using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/commissions")]
    [Authorize]
    public class PtCommissionsController : ControllerBase
    {
        private readonly ITrainerCommissionService _service;

        public PtCommissionsController(ITrainerCommissionService service) => _service = service;

        [HttpGet("rules/{trainerId:int}")]
        [HasPermission(PermissionCodes.ViewTrainerEarnings)]
        public async Task<ActionResult> GetRules(int trainerId, CancellationToken ct)
            => Ok(await _service.GetRulesAsync(trainerId, ct));

        [HttpPost("rules")]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult<TrainerCommissionRuleDto>> UpsertRule([FromBody] UpsertCommissionRuleDto dto, CancellationToken ct)
            => Ok(await _service.UpsertRuleAsync(dto, ct));

        [HttpGet]
        [HasPermission(PermissionCodes.ViewTrainerEarnings)]
        public async Task<ActionResult> Search([FromQuery] int? trainerId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
            => Ok(await _service.SearchCommissionsAsync(trainerId, page, pageSize, ct));

        [HttpPost("payouts")]
        [HasPermission(PermissionCodes.ViewTrainerEarnings)]
        public async Task<ActionResult<int>> CreatePayout([FromQuery] int trainerId, [FromQuery] int year, [FromQuery] int month, CancellationToken ct)
            => Ok(await _service.CreateMonthlyPayoutAsync(trainerId, year, month, ct));
    }
}
