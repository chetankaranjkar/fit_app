using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class TrainerScheduleService : ITrainerScheduleService
    {
        private readonly ApplicationDbContext _db;

        public TrainerScheduleService(ApplicationDbContext db) => _db = db;

        public async Task<IReadOnlyList<TrainerScheduleDto>> GetByTrainerAsync(int trainerId, CancellationToken ct = default)
        {
            var list = await _db.PTTrainerSchedules.AsNoTracking()
                .Where(s => s.TrainerId == trainerId && !s.IsDeleted)
                .OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime)
                .ToListAsync(ct);
            return list.Select(Map).ToList();
        }

        public async Task<TrainerScheduleDto> UpsertAsync(UpsertTrainerScheduleDto dto, CancellationToken ct = default)
        {
            if (dto.EndTime <= dto.StartTime)
                throw new BadRequestException("End time must be after start time.");

            var existing = await _db.PTTrainerSchedules
                .FirstOrDefaultAsync(s => s.TrainerId == dto.TrainerId && s.DayOfWeek == dto.DayOfWeek && !s.IsDeleted, ct);

            if (existing != null)
            {
                existing.StartTime = dto.StartTime;
                existing.EndTime = dto.EndTime;
                existing.BreakStart = dto.BreakStart;
                existing.BreakEnd = dto.BreakEnd;
                existing.SessionDurationMinutes = dto.SessionDurationMinutes;
                existing.MaxSessionsPerDay = dto.MaxSessionsPerDay;
                existing.IsActive = dto.IsActive;
                existing.UpdatedDate = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                return Map(existing);
            }

            var entity = new TrainerSchedule
            {
                TrainerId = dto.TrainerId,
                DayOfWeek = dto.DayOfWeek,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                BreakStart = dto.BreakStart,
                BreakEnd = dto.BreakEnd,
                SessionDurationMinutes = dto.SessionDurationMinutes,
                MaxSessionsPerDay = dto.MaxSessionsPerDay,
                IsActive = dto.IsActive,
            };
            await _db.PTTrainerSchedules.AddAsync(entity, ct);
            await _db.SaveChangesAsync(ct);
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var s = await _db.PTTrainerSchedules.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (s == null) return false;
            s.IsDeleted = true;
            s.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<IReadOnlyList<TrainerLeaveDto>> GetLeavesAsync(int trainerId, CancellationToken ct = default)
        {
            var list = await _db.PTTrainerLeaves.AsNoTracking()
                .Where(l => l.TrainerId == trainerId && !l.IsDeleted)
                .OrderByDescending(l => l.StartDate)
                .ToListAsync(ct);
            return list.Select(l => new TrainerLeaveDto
            {
                Id = l.Id,
                TrainerId = l.TrainerId,
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                Reason = l.Reason,
                IsApproved = l.IsApproved,
            }).ToList();
        }

        public async Task<TrainerLeaveDto> CreateLeaveAsync(CreateTrainerLeaveDto dto, CancellationToken ct = default)
        {
            if (dto.EndDate < dto.StartDate)
                throw new BadRequestException("Leave end date must be on or after start date.");
            var entity = new TrainerLeave
            {
                TrainerId = dto.TrainerId,
                StartDate = dto.StartDate.Date,
                EndDate = dto.EndDate.Date,
                Reason = dto.Reason?.Trim(),
            };
            await _db.PTTrainerLeaves.AddAsync(entity, ct);
            await _db.SaveChangesAsync(ct);
            return new TrainerLeaveDto
            {
                Id = entity.Id,
                TrainerId = entity.TrainerId,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                Reason = entity.Reason,
                IsApproved = entity.IsApproved,
            };
        }

        public async Task<bool> DeleteLeaveAsync(int id, CancellationToken ct = default)
        {
            var l = await _db.PTTrainerLeaves.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (l == null) return false;
            l.IsDeleted = true;
            l.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> IsTrainerAvailableAsync(int trainerId, DateTime startUtc, DateTime endUtc, int? excludeSessionId, CancellationToken ct = default)
        {
            if (endUtc <= startUtc) return false;

            var onLeave = await _db.PTTrainerLeaves.AnyAsync(l =>
                l.TrainerId == trainerId && !l.IsDeleted && l.IsApproved &&
                l.StartDate <= startUtc.Date && l.EndDate >= startUtc.Date, ct);
            if (onLeave) return false;

            var day = (int)startUtc.DayOfWeek;
            var time = startUtc.TimeOfDay;
            var schedule = await _db.PTTrainerSchedules.AsNoTracking()
                .FirstOrDefaultAsync(s => s.TrainerId == trainerId && s.DayOfWeek == day && s.IsActive && !s.IsDeleted, ct);
            if (schedule == null) return false;
            if (time < schedule.StartTime || endUtc.TimeOfDay > schedule.EndTime) return false;
            if (schedule.BreakStart.HasValue && schedule.BreakEnd.HasValue &&
                time < schedule.BreakEnd && endUtc.TimeOfDay > schedule.BreakStart)
                return false;

            var sessionsToday = await _db.PTSessions.CountAsync(s =>
                s.TrainerId == trainerId && !s.IsDeleted &&
                s.Status != PTSessionStatus.Cancelled &&
                s.ScheduledStartUtc.Date == startUtc.Date &&
                (excludeSessionId == null || s.Id != excludeSessionId), ct);
            if (sessionsToday >= schedule.MaxSessionsPerDay) return false;

            var overlap = await _db.PTSessions.AnyAsync(s =>
                s.TrainerId == trainerId && !s.IsDeleted &&
                s.Status != PTSessionStatus.Cancelled &&
                (excludeSessionId == null || s.Id != excludeSessionId) &&
                s.ScheduledStartUtc < endUtc && s.ScheduledEndUtc > startUtc, ct);
            return !overlap;
        }

        private static TrainerScheduleDto Map(TrainerSchedule s) => new()
        {
            Id = s.Id,
            TrainerId = s.TrainerId,
            DayOfWeek = s.DayOfWeek,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            BreakStart = s.BreakStart,
            BreakEnd = s.BreakEnd,
            SessionDurationMinutes = s.SessionDurationMinutes,
            MaxSessionsPerDay = s.MaxSessionsPerDay,
            IsActive = s.IsActive,
        };
    }
}
