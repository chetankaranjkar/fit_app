using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        private readonly ApplicationDbContext _db;

        public PtSessionsController(
            IPtSessionService service,
            IPtAttendanceService attendanceService,
            ApplicationDbContext db)
        {
            _service = service;
            _attendanceService = attendanceService;
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult> Search([FromQuery] PTSessionFilterDto filter, CancellationToken ct)
        {
            if (UserDirectoryScope.ShouldApplyCoachFilter(HttpContext))
            {
                var trainerProfileId = await UserDirectoryScope.ResolveTrainerProfileIdAsync(HttpContext, _db, ct);
                if (!trainerProfileId.HasValue || (filter.TrainerId.HasValue && filter.TrainerId != trainerProfileId))
                    return Forbid();
                filter.TrainerId = trainerProfileId;
            }

            return Ok(await _service.SearchAsync(filter, ct));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<PTSessionDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            if (dto == null) return NotFound();
            if (!await UserDirectoryScope.CanAccessTrainerProfileAsync(HttpContext, _db, dto.TrainerId, ct))
                return Forbid();
            return Ok(dto);
        }

        [HttpPost("book")]
        public async Task<ActionResult<PTSessionDto>> Book([FromBody] BookPTSessionDto dto, CancellationToken ct)
            => Ok(await _service.BookAsync(dto, ResolveUserId(), ct));

        [HttpPost("{id:int}/reschedule")]
        public async Task<ActionResult<PTSessionDto>> Reschedule(int id, [FromBody] ReschedulePTSessionDto dto, CancellationToken ct)
        {
            if (!await CanAccessSessionAsync(id, ct)) return Forbid();
            var result = await _service.RescheduleAsync(id, dto, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/cancel")]
        public async Task<ActionResult<PTSessionDto>> Cancel(int id, [FromBody] string? notes, CancellationToken ct)
        {
            if (!await CanAccessSessionAsync(id, ct)) return Forbid();
            var result = await _service.CancelAsync(id, notes, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/attendance")]
        public async Task<ActionResult<PTAttendanceDto>> MarkAttendance(int id, [FromBody] MarkPTAttendanceDto dto, CancellationToken ct)
        {
            if (!await CanAccessSessionAsync(id, ct)) return Forbid();
            return Ok(await _attendanceService.MarkAsync(id, dto, ct));
        }

        /// <summary>Missing sessions pass so the service keeps returning its own 404.</summary>
        private async Task<bool> CanAccessSessionAsync(int sessionId, CancellationToken ct)
        {
            if (!UserDirectoryScope.ShouldApplyCoachFilter(HttpContext))
                return true;
            var trainerId = await _db.PTSessions.AsNoTracking()
                .Where(s => s.Id == sessionId && !s.IsDeleted)
                .Select(s => (int?)s.TrainerId)
                .FirstOrDefaultAsync(ct);
            return !trainerId.HasValue
                   || await UserDirectoryScope.CanAccessTrainerProfileAsync(HttpContext, _db, trainerId.Value, ct);
        }

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
