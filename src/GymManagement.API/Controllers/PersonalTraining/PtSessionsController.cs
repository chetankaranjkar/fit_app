using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/sessions")]
    [Authorize]
    [HasPermission(PermissionCodes.BookPtSessions)]
    public class PtSessionsController : ControllerBase
    {
        private readonly IPtSessionService _service;
        private readonly IPtAttendanceService _attendanceService;

        public PtSessionsController(IPtSessionService service, IPtAttendanceService attendanceService)
        {
            _service = service;
            _attendanceService = attendanceService;
        }

        [HttpGet]
        public async Task<ActionResult> Search([FromQuery] PTSessionFilterDto filter, CancellationToken ct)
            => Ok(await _service.SearchAsync(filter, ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<PTSessionDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost("book")]
        public async Task<ActionResult<PTSessionDto>> Book([FromBody] BookPTSessionDto dto, CancellationToken ct)
            => Ok(await _service.BookAsync(dto, ResolveUserId(), ct));

        [HttpPost("{id:int}/reschedule")]
        public async Task<ActionResult<PTSessionDto>> Reschedule(int id, [FromBody] ReschedulePTSessionDto dto, CancellationToken ct)
        {
            var result = await _service.RescheduleAsync(id, dto, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/cancel")]
        public async Task<ActionResult<PTSessionDto>> Cancel(int id, [FromBody] string? notes, CancellationToken ct)
        {
            var result = await _service.CancelAsync(id, notes, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/attendance")]
        public async Task<ActionResult<PTAttendanceDto>> MarkAttendance(int id, [FromBody] MarkPTAttendanceDto dto, CancellationToken ct)
            => Ok(await _attendanceService.MarkAsync(id, dto, ct));

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
