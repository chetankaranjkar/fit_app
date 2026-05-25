using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/schedules")]
    [Authorize]
    [HasPermission(PermissionCodes.ManagePtSchedules)]
    public class TrainerSchedulesController : ControllerBase
    {
        private readonly ITrainerScheduleService _service;

        public TrainerSchedulesController(ITrainerScheduleService service) => _service = service;

        [HttpGet("trainer/{trainerId:int}")]
        public async Task<ActionResult<IReadOnlyList<TrainerScheduleDto>>> GetSchedules(int trainerId, CancellationToken ct)
            => Ok(await _service.GetByTrainerAsync(trainerId, ct));

        [HttpPost]
        public async Task<ActionResult<TrainerScheduleDto>> Upsert([FromBody] UpsertTrainerScheduleDto dto, CancellationToken ct)
            => Ok(await _service.UpsertAsync(dto, ct));

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSchedule(int id, CancellationToken ct)
            => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();

        [HttpGet("trainer/{trainerId:int}/leaves")]
        public async Task<ActionResult<IReadOnlyList<TrainerLeaveDto>>> GetLeaves(int trainerId, CancellationToken ct)
            => Ok(await _service.GetLeavesAsync(trainerId, ct));

        [HttpPost("leaves")]
        public async Task<ActionResult<TrainerLeaveDto>> CreateLeave([FromBody] CreateTrainerLeaveDto dto, CancellationToken ct)
            => Ok(await _service.CreateLeaveAsync(dto, ct));

        [HttpDelete("leaves/{id:int}")]
        public async Task<IActionResult> DeleteLeave(int id, CancellationToken ct)
            => await _service.DeleteLeaveAsync(id, ct) ? NoContent() : NotFound();

        [HttpGet("availability")]
        public async Task<ActionResult<bool>> CheckAvailability([FromQuery] int trainerId, [FromQuery] DateTime startUtc, [FromQuery] DateTime endUtc, [FromQuery] int? excludeSessionId, CancellationToken ct)
            => Ok(await _service.IsTrainerAvailableAsync(trainerId, startUtc, endUtc, excludeSessionId, ct));
    }
}
