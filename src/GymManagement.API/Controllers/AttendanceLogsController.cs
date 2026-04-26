using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceLogsController : ControllerBase
    {
        private readonly IAttendanceLogService _attendanceLogService;

        public AttendanceLogsController(IAttendanceLogService attendanceLogService)
        {
            _attendanceLogService = attendanceLogService;
        }

        [HttpGet]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<IEnumerable<AttendanceLogDto>>> GetAllAttendanceLogs()
        {
            var logs = await _attendanceLogService.GetAllAttendanceLogsAsync();
            return Ok(logs);
        }

        [HttpGet("user/{userId}")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<IEnumerable<AttendanceLogDto>>> GetAttendanceLogsByUser(int userId)
        {
            var logs = await _attendanceLogService.GetAttendanceLogsByUserIdAsync(userId);
            return Ok(logs);
        }

        [HttpGet("logged-by/{loggedByUserId}")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<IEnumerable<AttendanceLogDto>>> GetAttendanceLogsByLoggedByUser(int loggedByUserId)
        {
            var logs = await _attendanceLogService.GetAttendanceLogsByLoggedByUserIdAsync(loggedByUserId);
            return Ok(logs);
        }

        [HttpGet("date/{date}")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<IEnumerable<AttendanceLogDto>>> GetAttendanceLogsByDate(DateTime date)
        {
            var logs = await _attendanceLogService.GetAttendanceLogsByDateAsync(date);
            return Ok(logs);
        }

        [HttpGet("daterange")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<IEnumerable<AttendanceLogDto>>> GetAttendanceLogsByDateRange(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate)
        {
            var logs = await _attendanceLogService.GetAttendanceLogsByDateRangeAsync(startDate, endDate);
            return Ok(logs);
        }

        [HttpGet("user/{userId}/active")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> GetActiveCheckIn(int userId)
        {
            var log = await _attendanceLogService.GetActiveCheckInAsync(userId);
            if (log == null)
                return NotFound();
            return Ok(log);
        }

        [HttpGet("statistics/daily")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<Dictionary<DateTime, int>>> GetDailyAttendanceCount(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            var statistics = await _attendanceLogService.GetDailyAttendanceCountAsync(startDate, endDate);
            return Ok(statistics);
        }

        [HttpGet("{id}")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> GetAttendanceLog(int id)
        {
            var log = await _attendanceLogService.GetAttendanceLogByIdAsync(id);
            if (log == null)
                return NotFound();
            return Ok(log);
        }

        [HttpPost("checkin")]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> CheckIn(CheckInDto checkInDto)
        {
            var userIdClaim = User.FindFirst("uid")?.Value;
            if (checkInDto.UserId <= 0 && !string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var userId))
                checkInDto.UserId = userId;
            if (!checkInDto.LoggedByUserId.HasValue && !string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var loggedBy))
                checkInDto.LoggedByUserId = loggedBy;

            var log = await _attendanceLogService.CheckInAsync(checkInDto);
            return CreatedAtAction(nameof(GetAttendanceLog), new { id = log.Id }, log);
        }

        [HttpPost("checkout")]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> CheckOut(CheckOutDto checkOutDto)
        {
            var log = await _attendanceLogService.CheckOutAsync(checkOutDto);
            if (log == null)
                return NotFound();
            return Ok(log);
        }

        [HttpPost]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> CreateAttendanceLog(CreateAttendanceLogDto createDto)
        {
            var log = await _attendanceLogService.CreateAttendanceLogAsync(createDto);
            return CreatedAtAction(nameof(GetAttendanceLog), new { id = log.Id }, log);
        }

        [HttpPut("{id}")]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> UpdateAttendanceLog(int id, UpdateAttendanceLogDto updateDto)
        {
            var log = await _attendanceLogService.UpdateAttendanceLogAsync(id, updateDto);
            if (log == null)
                return NotFound();
            return Ok(log);
        }

        [HttpDelete("{id}")]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<IActionResult> DeleteAttendanceLog(int id)
        {
            var result = await _attendanceLogService.DeleteAttendanceLogAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }

        [HttpGet("anomalies/{date}")]
        [HasPermission(PermissionCodes.VIEW_ATTENDANCE)]
        public async Task<ActionResult<IEnumerable<AttendanceAnomalyDto>>> GetAnomalies(DateTime date, [FromQuery] int lateThresholdMinutes = 15)
        {
            var anomalies = await _attendanceLogService.GetAttendanceAnomaliesAsync(date, lateThresholdMinutes);
            return Ok(anomalies);
        }

        [HttpPut("{id}/correction")]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<ActionResult<AttendanceLogDto>> CorrectAttendanceLog(int id, AttendanceCorrectionDto correctionDto)
        {
            var userIdClaim = User.FindFirst("uid")?.Value;
            var correctedBy = int.TryParse(userIdClaim, out var v) ? v : (int?)null;
            var corrected = await _attendanceLogService.CorrectAttendanceLogAsync(id, correctionDto, correctedBy);
            if (corrected == null) return NotFound();
            return Ok(corrected);
        }

        [HttpPost("corrections/bulk")]
        [HasPermission(PermissionCodes.MANAGE_ATTENDANCE)]
        public async Task<ActionResult<object>> BulkCorrectAttendanceLogs(BulkAttendanceCorrectionDto correctionDto)
        {
            var userIdClaim = User.FindFirst("uid")?.Value;
            var correctedBy = int.TryParse(userIdClaim, out var v) ? v : (int?)null;
            var updated = await _attendanceLogService.BulkCorrectAttendanceLogsAsync(correctionDto, correctedBy);
            return Ok(new { updated });
        }
    }
}

