using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class AttendanceLogService : IAttendanceLogService
    {
        private readonly IUnitOfWork _unitOfWork;

        public AttendanceLogService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<AttendanceLogDto>> GetAllAttendanceLogsAsync()
        {
            var logs = await _unitOfWork.AttendanceLogs.GetAllAsync();
            return await MapAttendanceLogsToDtoAsync(logs.OrderByDescending(l => l.CheckInTime));
        }

        public async Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByUserIdAsync(int userId)
        {
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => al.UserId == userId);
            return await MapAttendanceLogsToDtoAsync(logs.OrderByDescending(l => l.CheckInTime));
        }

        public async Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByLoggedByUserIdAsync(int loggedByUserId)
        {
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => al.LoggedByUserId == loggedByUserId);
            return await MapAttendanceLogsToDtoAsync(logs.OrderByDescending(l => l.CheckInTime));
        }

        public async Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByDateAsync(DateTime date)
        {
            var dateOnly = date.Date;
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => al.AttendanceDate.Date == dateOnly);
            return await MapAttendanceLogsToDtoAsync(logs.OrderByDescending(l => l.CheckInTime));
        }

        public async Task<IEnumerable<AttendanceLogDto>> GetAttendanceLogsByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            var start = startDate.Date;
            var end = endDate.Date;
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => 
                al.AttendanceDate.Date >= start && al.AttendanceDate.Date <= end);
            return await MapAttendanceLogsToDtoAsync(logs.OrderByDescending(l => l.CheckInTime));
        }

        public async Task<AttendanceLogDto?> GetAttendanceLogByIdAsync(int id)
        {
            var log = await _unitOfWork.AttendanceLogs.GetByIdAsync(id);
            if (log == null) return null;

            var logs = new[] { log };
            var dtos = await MapAttendanceLogsToDtoAsync(logs);
            return dtos.FirstOrDefault();
        }

        public async Task<AttendanceLogDto?> GetActiveCheckInAsync(int userId)
        {
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => 
                al.UserId == userId && al.CheckOutTime == null);
            var activeLog = logs.OrderByDescending(l => l.CheckInTime).FirstOrDefault();
            
            if (activeLog == null) return null;

            var logsList = new[] { activeLog };
            var dtos = await MapAttendanceLogsToDtoAsync(logsList);
            return dtos.FirstOrDefault();
        }

        public async Task<AttendanceLogDto?> GetActiveCheckInByLoggedByUserAsync(int loggedByUserId)
        {
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => 
                al.LoggedByUserId == loggedByUserId && al.CheckOutTime == null);
            var activeLog = logs.OrderByDescending(l => l.CheckInTime).FirstOrDefault();
            
            if (activeLog == null) return null;

            var logsList = new[] { activeLog };
            var dtos = await MapAttendanceLogsToDtoAsync(logsList);
            return dtos.FirstOrDefault();
        }

        public async Task<AttendanceLogDto> CheckInAsync(CheckInDto checkInDto)
        {
            var today = DateTime.UtcNow.Date;
            var checkInTime = DateTime.UtcNow;

            if (checkInDto.UserId <= 0)
                throw new BadRequestException("UserId must be provided for check-in.");

            int userId = checkInDto.UserId;
            int? loggedByUserId = checkInDto.LoggedByUserId;

            // Check for active check-in (not checked out)
            var activeCheckIn = await GetActiveCheckInAsync(userId);
            if (activeCheckIn != null)
                throw new ConflictException("User already has an active check-in. Please check out first.");

            // Check if user already checked in today (even if checked out)
            var todayLogs = await _unitOfWork.AttendanceLogs.FindAsync(al => 
                al.UserId == userId && al.AttendanceDate.Date == today);
            if (todayLogs.Any())
                throw new ConflictException("User has already checked in today. They can only check in once per day.");

            var attendanceLog = new AttendanceLog
            {
                UserId = userId,
                LoggedByUserId = loggedByUserId,
                CheckInTime = checkInTime,
                AttendanceDate = today,
                CheckInMethod = checkInDto.CheckInMethod ?? "Manual",
                Notes = checkInDto.Notes
            };

            await _unitOfWork.AttendanceLogs.AddAsync(attendanceLog);
            await _unitOfWork.SaveChangesAsync();

            var logs = new[] { attendanceLog };
            var dtos = await MapAttendanceLogsToDtoAsync(logs);
            return dtos.First();
        }

        public async Task<AttendanceLogDto?> CheckOutAsync(CheckOutDto checkOutDto)
        {
            var attendanceLog = await _unitOfWork.AttendanceLogs.GetByIdAsync(checkOutDto.AttendanceLogId);
            if (attendanceLog == null) return null;

            if (attendanceLog.CheckOutTime.HasValue)
            {
                throw new ConflictException("User has already checked out.");
            }

            var checkOutTime = DateTime.UtcNow;
            attendanceLog.CheckOutTime = checkOutTime;
            attendanceLog.CheckOutMethod = checkOutDto.CheckOutMethod ?? "Manual";
            
            // Calculate duration
            var duration = checkOutTime - attendanceLog.CheckInTime;
            attendanceLog.DurationMinutes = (int)duration.TotalMinutes;

            if (checkOutDto.Notes != null)
            {
                attendanceLog.Notes = string.IsNullOrEmpty(attendanceLog.Notes) 
                    ? checkOutDto.Notes 
                    : $"{attendanceLog.Notes}\n{checkOutDto.Notes}";
            }

            _unitOfWork.AttendanceLogs.Update(attendanceLog);
            await _unitOfWork.SaveChangesAsync();

            var logs = new[] { attendanceLog };
            var dtos = await MapAttendanceLogsToDtoAsync(logs);
            return dtos.First();
        }

        public async Task<AttendanceLogDto> CreateAttendanceLogAsync(CreateAttendanceLogDto createDto)
        {
            var checkInTime = createDto.CheckInTime ?? DateTime.UtcNow;
            var attendanceLog = new AttendanceLog
            {
                UserId = createDto.UserId,
                CheckInTime = checkInTime,
                AttendanceDate = checkInTime.Date,
                CheckInMethod = createDto.CheckInMethod ?? "Manual",
                Notes = createDto.Notes
            };

            await _unitOfWork.AttendanceLogs.AddAsync(attendanceLog);
            await _unitOfWork.SaveChangesAsync();

            var logs = new[] { attendanceLog };
            var dtos = await MapAttendanceLogsToDtoAsync(logs);
            return dtos.First();
        }

        public async Task<AttendanceLogDto?> UpdateAttendanceLogAsync(int id, UpdateAttendanceLogDto updateDto)
        {
            var attendanceLog = await _unitOfWork.AttendanceLogs.GetByIdAsync(id);
            if (attendanceLog == null) return null;

            if (updateDto.CheckOutTime.HasValue)
            {
                attendanceLog.CheckOutTime = updateDto.CheckOutTime;
                var duration = updateDto.CheckOutTime.Value - attendanceLog.CheckInTime;
                attendanceLog.DurationMinutes = (int)duration.TotalMinutes;
            }
            if (updateDto.CheckOutMethod != null)
                attendanceLog.CheckOutMethod = updateDto.CheckOutMethod;
            if (updateDto.Notes != null)
                attendanceLog.Notes = updateDto.Notes;
            if (updateDto.ExceptionReason != null)
                attendanceLog.ExceptionReason = updateDto.ExceptionReason;

            _unitOfWork.AttendanceLogs.Update(attendanceLog);
            await _unitOfWork.SaveChangesAsync();

            var logs = new[] { attendanceLog };
            var dtos = await MapAttendanceLogsToDtoAsync(logs);
            return dtos.First();
        }

        public async Task<AttendanceLogDto?> CorrectAttendanceLogAsync(int id, AttendanceCorrectionDto correctionDto, int? correctedByUserId)
        {
            if (string.IsNullOrWhiteSpace(correctionDto.AuditNote))
                throw new BadRequestException("Audit note is required for manual correction.");

            var attendanceLog = await _unitOfWork.AttendanceLogs.GetByIdAsync(id);
            if (attendanceLog == null) return null;

            if (correctionDto.CheckInTime.HasValue)
            {
                attendanceLog.CheckInTime = correctionDto.CheckInTime.Value;
                attendanceLog.AttendanceDate = correctionDto.CheckInTime.Value.Date;
            }

            if (correctionDto.CheckOutTime.HasValue)
            {
                attendanceLog.CheckOutTime = correctionDto.CheckOutTime.Value;
                attendanceLog.DurationMinutes = (int)(correctionDto.CheckOutTime.Value - attendanceLog.CheckInTime).TotalMinutes;
            }

            if (correctionDto.ExceptionReason != null)
                attendanceLog.ExceptionReason = correctionDto.ExceptionReason;

            attendanceLog.IsManualCorrection = true;
            attendanceLog.CorrectedByUserId = correctedByUserId;
            attendanceLog.CorrectedAt = DateTime.UtcNow;
            attendanceLog.CorrectionAuditNote = correctionDto.AuditNote.Trim();

            _unitOfWork.AttendanceLogs.Update(attendanceLog);
            await _unitOfWork.SaveChangesAsync();

            var dtos = await MapAttendanceLogsToDtoAsync(new[] { attendanceLog });
            return dtos.FirstOrDefault();
        }

        public async Task<int> BulkCorrectAttendanceLogsAsync(BulkAttendanceCorrectionDto correctionDto, int? correctedByUserId)
        {
            if (correctionDto.AttendanceLogIds == null || correctionDto.AttendanceLogIds.Count == 0)
                throw new BadRequestException("At least one attendance log id is required.");
            if (string.IsNullOrWhiteSpace(correctionDto.AuditNote))
                throw new BadRequestException("Audit note is required for bulk correction.");

            var ids = correctionDto.AttendanceLogIds.Distinct().ToList();
            var logs = (await _unitOfWork.AttendanceLogs.FindAsync(a => ids.Contains(a.Id))).ToList();
            if (logs.Count == 0) return 0;

            foreach (var log in logs)
            {
                if (correctionDto.ExceptionReason != null)
                    log.ExceptionReason = correctionDto.ExceptionReason;
                log.IsManualCorrection = true;
                log.CorrectedByUserId = correctedByUserId;
                log.CorrectedAt = DateTime.UtcNow;
                log.CorrectionAuditNote = correctionDto.AuditNote.Trim();
                _unitOfWork.AttendanceLogs.Update(log);
            }

            await _unitOfWork.SaveChangesAsync();
            return logs.Count;
        }

        public async Task<bool> DeleteAttendanceLogAsync(int id)
        {
            var attendanceLog = await _unitOfWork.AttendanceLogs.GetByIdAsync(id);
            if (attendanceLog == null) return false;

            _unitOfWork.AttendanceLogs.Delete(attendanceLog);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<Dictionary<DateTime, int>> GetDailyAttendanceCountAsync(DateTime startDate, DateTime endDate)
        {
            var logs = await _unitOfWork.AttendanceLogs.FindAsync(al => 
                al.AttendanceDate.Date >= startDate.Date && al.AttendanceDate.Date <= endDate.Date);
            
            return logs
                .GroupBy(l => l.AttendanceDate.Date)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        public async Task<IEnumerable<AttendanceAnomalyDto>> GetAttendanceAnomaliesAsync(DateTime date, int lateThresholdMinutes)
        {
            var day = date.Date;
            var logs = (await _unitOfWork.AttendanceLogs.FindAsync(a => a.AttendanceDate.Date == day)).ToList();
            var schedules = (await _unitOfWork.UserSchedules.FindAsync(s => s.IsActive && s.DayOfWeek == day.DayOfWeek)).ToList();
            var userIds = logs.Where(x => x.UserId.HasValue).Select(x => x.UserId!.Value)
                .Concat(schedules.Select(s => s.UserId))
                .Distinct()
                .ToList();
            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);

            var result = new List<AttendanceAnomalyDto>();

            foreach (var log in logs.Where(x => x.UserId.HasValue))
            {
                var userId = log.UserId!.Value;
                var schedule = schedules.Where(s => s.UserId == userId).OrderBy(s => s.StartTime).FirstOrDefault();
                if (schedule == null) continue;

                var checkInLocal = log.CheckInTime;
                var scheduledAt = day.Add(schedule.StartTime);
                var lateBy = (int)(checkInLocal - scheduledAt).TotalMinutes;
                if (lateBy > lateThresholdMinutes)
                {
                    result.Add(new AttendanceAnomalyDto
                    {
                        UserId = userId,
                        UserName = users.TryGetValue(userId, out var u) ? $"{u.FirstName} {u.LastName}".Trim() : "Unknown",
                        AttendanceDate = day,
                        Type = "late",
                        Message = $"Checked in {lateBy} minutes late.",
                        AttendanceLogId = log.Id,
                        LateByMinutes = lateBy
                    });
                }
            }

            var presentUserIds = logs.Where(x => x.UserId.HasValue).Select(x => x.UserId!.Value).ToHashSet();
            foreach (var userId in schedules.Select(s => s.UserId).Distinct())
            {
                if (presentUserIds.Contains(userId)) continue;
                result.Add(new AttendanceAnomalyDto
                {
                    UserId = userId,
                    UserName = users.TryGetValue(userId, out var u) ? $"{u.FirstName} {u.LastName}".Trim() : "Unknown",
                    AttendanceDate = day,
                    Type = "no_show",
                    Message = "Scheduled but no attendance was logged.",
                    AttendanceLogId = null,
                    LateByMinutes = null
                });
            }

            return result.OrderBy(r => r.Type).ThenBy(r => r.UserName).ToList();
        }

        private async Task<IEnumerable<AttendanceLogDto>> MapAttendanceLogsToDtoAsync(IEnumerable<AttendanceLog> logs)
        {
            var logsList = logs.ToList();
            var userIds = logsList.Where(l => l.UserId.HasValue).Select(l => l.UserId!.Value).Distinct().ToList();
            var users = userIds.Any() ? await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id)) : new List<User>();
            var userDict = users.ToDictionary(u => u.Id);

            return logsList.Select(log => new AttendanceLogDto
            {
                Id = log.Id,
                UserId = log.UserId ?? 0,
                UserName = log.UserId.HasValue && userDict.ContainsKey(log.UserId.Value)
                    ? $"{userDict[log.UserId.Value].FirstName} {userDict[log.UserId.Value].LastName}"
                    : "Unknown",
                CheckInTime = log.CheckInTime,
                CheckOutTime = log.CheckOutTime,
                AttendanceDate = log.AttendanceDate,
                DurationMinutes = log.DurationMinutes,
                Notes = log.Notes,
                CheckInMethod = log.CheckInMethod,
                CheckOutMethod = log.CheckOutMethod,
                IsCheckedIn = log.CheckOutTime == null,
                ExceptionReason = log.ExceptionReason,
                CorrectionAuditNote = log.CorrectionAuditNote,
                IsManualCorrection = log.IsManualCorrection,
                CorrectedByUserId = log.CorrectedByUserId,
                CorrectedAt = log.CorrectedAt
            });
        }
    }
}

