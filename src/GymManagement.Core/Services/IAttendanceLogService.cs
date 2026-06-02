using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;

namespace GymManagement.Core.Services
{
    public interface IAttendanceLogService
    {
        Task<PagedResultDto<AttendanceLogDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? sortBy = null,
            string? sortDir = null);

        Task<IEnumerable<AttendanceLogDto>> GetAllAttendanceLogsAsync();
        Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByUserIdAsync(int userId);
        Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByLoggedByUserIdAsync(int loggedByUserId);
        Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByDateAsync(DateTime date);
        Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<AttendanceLogDto?> GetAttendanceLogByIdAsync(int id);
        Task<AttendanceLogDto?> GetActiveCheckInAsync(int userId);
        Task<AttendanceLogDto?> GetActiveCheckInByLoggedByUserAsync(int loggedByUserId);
        Task<AttendanceLogDto> CheckInAsync(CheckInDto checkInDto);
        Task<AttendanceLogDto?> CheckOutAsync(CheckOutDto checkOutDto);
        Task<AttendanceLogDto> CreateAttendanceLogAsync(CreateAttendanceLogDto createDto);
        Task<AttendanceLogDto?> UpdateAttendanceLogAsync(int id, UpdateAttendanceLogDto updateDto);
        Task<AttendanceLogDto?> CorrectAttendanceLogAsync(int id, AttendanceCorrectionDto correctionDto, int? correctedByUserId);
        Task<int> BulkCorrectAttendanceLogsAsync(BulkAttendanceCorrectionDto correctionDto, int? correctedByUserId);
        Task<bool> DeleteAttendanceLogAsync(int id);
        Task<Dictionary<DateTime, int>> GetDailyAttendanceCountAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<AttendanceAnomalyDto>> GetAttendanceAnomaliesAsync(DateTime date, int lateThresholdMinutes);
    }
}

