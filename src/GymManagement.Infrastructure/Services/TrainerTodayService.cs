using GymManagement.Core.DTOs;
using GymManagement.Core.Scheduling;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public class TrainerTodayService : ITrainerTodayService
    {
        private readonly ApplicationDbContext _db;
        private readonly IUserInstructorService _userInstructorService;

        public TrainerTodayService(ApplicationDbContext db, IUserInstructorService userInstructorService)
        {
            _db = db;
            _userInstructorService = userInstructorService;
        }

        public async Task<TrainerTodayDto?> GetTodayAsync(
            int trainerId,
            int utcOffsetMinutes,
            int missedLookbackDays,
            DateTime nowUtc,
            CancellationToken cancellationToken = default)
        {
            var trainer = await _db.Trainers.AsNoTracking()
                .Where(t => t.Id == trainerId && !t.IsDeleted)
                .Select(t => new { t.Id, t.MaxActiveClients })
                .FirstOrDefaultAsync(cancellationToken);
            if (trainer == null)
                return null;

            var offset = TimeSpan.FromMinutes(utcOffsetMinutes);
            var localNow = nowUtc + offset;
            var today = DateOnly.FromDateTime(localNow);
            var lookback = Math.Clamp(missedLookbackDays, 0, TrainerDayRules.MaxMissedLookbackDays);
            var todayStartUtc = today.ToDateTime(TimeOnly.MinValue) - offset;
            var todayEndUtc = todayStartUtc.AddDays(1);
            var lookbackStartUtc = todayStartUtc.AddDays(-lookback);

            var assigned = await _userInstructorService.GetTrainerAssignedClientsAsync(trainerId);
            var assignedIds = assigned.Select(c => c.UserId).Distinct().ToList();
            var activeIds = assignedIds.Count == 0
                ? new HashSet<int>()
                : (await _db.Users.AsNoTracking()
                    .Where(u => assignedIds.Contains(u.Id) && u.IsActive && !u.IsDeleted)
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken)).ToHashSet();
            var clients = assigned
                .Where(c => activeIds.Contains(c.UserId))
                .GroupBy(c => c.UserId)
                .Select(g => g.First())
                .ToList();
            var clientIds = clients.Select(c => c.UserId).ToList();

            var checkIns = clientIds.Count == 0
                ? new List<(int UserId, DateTime CheckInTime, string? Method)>()
                : (await _db.AttendanceLogs.AsNoTracking()
                    .Where(a => !a.IsDeleted
                                && a.UserId.HasValue
                                && clientIds.Contains(a.UserId.Value)
                                && a.CheckInTime >= lookbackStartUtc
                                && a.CheckInTime < todayEndUtc)
                    .Select(a => new { UserId = a.UserId!.Value, a.CheckInTime, a.CheckInMethod })
                    .ToListAsync(cancellationToken))
                    .Select(a => (UserId: a.UserId, CheckInTime: a.CheckInTime, Method: (string?)a.CheckInMethod))
                    .ToList();

            var expectedToday = new List<TrainerTodayClientDto>();
            var inferredMisses = new List<TrainerInferredMissDto>();
            var withoutSchedule = 0;

            foreach (var client in clients)
            {
                var schedule = new TrainingScheduleInput(
                    client.TrainingScheduleType,
                    client.PreferredGymTime,
                    client.TrainingStartTime,
                    client.TrainingEndTime,
                    client.TrainingDaysOfWeek);
                var name = $"{client.FirstName} {client.LastName}".Trim();

                if (!MemberTrainingScheduleRules.TryResolveSchedule(
                        schedule.ScheduleType,
                        schedule.PreferredGymTime,
                        schedule.TrainingStartTime,
                        schedule.TrainingEndTime,
                        schedule.TrainingDaysOfWeek,
                        out _, out _, out _))
                {
                    withoutSchedule++;
                    continue;
                }

                var clientCheckIns = checkIns.Where(c => c.UserId == client.UserId).ToList();
                var checkInDays = clientCheckIns
                    .Select(c => DateOnly.FromDateTime(c.CheckInTime + offset))
                    .ToHashSet();

                if (TrainerDayRules.TryGetWindowOn(schedule, today.DayOfWeek, out var start, out var end))
                {
                    var todayCheckIn = clientCheckIns
                        .Where(c => DateOnly.FromDateTime(c.CheckInTime + offset) == today)
                        .OrderBy(c => c.CheckInTime)
                        .Select(c => ((DateTime CheckInTime, string? Method)?)(c.CheckInTime, c.Method))
                        .FirstOrDefault();
                    var state = TrainerDayRules.Classify(schedule, today, localNow, todayCheckIn.HasValue);
                    expectedToday.Add(new TrainerTodayClientDto
                    {
                        UserId = client.UserId,
                        MemberName = name,
                        ScheduleLabel = client.TrainingScheduleLabel,
                        WindowStart = start.ToString(@"hh\:mm"),
                        WindowEnd = end.ToString(@"hh\:mm"),
                        State = state.ToString(),
                        CheckInTimeUtc = todayCheckIn.HasValue
                            ? DateTime.SpecifyKind(todayCheckIn.Value.CheckInTime, DateTimeKind.Utc)
                            : null,
                        CheckInMethod = todayCheckIn?.Method,
                    });
                }

                DateOnly? assignedOn = client.AssignedOn.HasValue
                    ? DateOnly.FromDateTime(client.AssignedOn.Value + offset)
                    : null;
                foreach (var missed in TrainerDayRules.InferMissedDays(schedule, today, lookback, checkInDays, assignedOn))
                {
                    inferredMisses.Add(new TrainerInferredMissDto
                    {
                        UserId = client.UserId,
                        MemberName = name,
                        LocalDate = missed.ToString("yyyy-MM-dd"),
                        ScheduleLabel = client.TrainingScheduleLabel,
                    });
                }
            }

            var ptToday = await _db.PTSessions.AsNoTracking()
                .Where(s => s.TrainerId == trainerId
                            && !s.IsDeleted
                            && s.Status != PTSessionStatus.Cancelled
                            && s.Status != PTSessionStatus.Rescheduled
                            && s.ScheduledStartUtc >= todayStartUtc
                            && s.ScheduledStartUtc < todayEndUtc)
                .OrderBy(s => s.ScheduledStartUtc)
                .Select(PtProjection)
                .ToListAsync(cancellationToken);

            var ptNoShows = await _db.PTSessions.AsNoTracking()
                .Where(s => s.TrainerId == trainerId
                            && !s.IsDeleted
                            && s.ScheduledStartUtc >= lookbackStartUtc
                            && s.ScheduledStartUtc < nowUtc
                            && (s.Status == PTSessionStatus.NoShow
                                || (s.Attendance != null && !s.Attendance.IsDeleted && s.Attendance.IsNoShow)))
                .OrderByDescending(s => s.ScheduledStartUtc)
                .Take(20)
                .Select(PtProjection)
                .ToListAsync(cancellationToken);

            return new TrainerTodayDto
            {
                TrainerId = trainer.Id,
                LocalDate = today.ToString("yyyy-MM-dd"),
                GeneratedAtUtc = DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc),
                MissedLookbackDays = lookback,
                ActiveClients = assignedIds.Count,
                ConfiguredMaxActiveClients = trainer.MaxActiveClients,
                EffectiveCapacity = TrainerDayRules.EffectiveCapacity(trainer.MaxActiveClients),
                ClientsWithoutSchedule = withoutSchedule,
                ExpectedToday = expectedToday.OrderBy(c => c.WindowStart).ThenBy(c => c.MemberName).ToList(),
                PtSessionsToday = ptToday.Select(MapPt).ToList(),
                RecentInferredMisses = inferredMisses
                    .OrderByDescending(m => m.LocalDate)
                    .ThenBy(m => m.MemberName)
                    .ToList(),
                RecentPtNoShows = ptNoShows.Select(MapPt).ToList(),
            };
        }

        private sealed class PtRow
        {
            public int SessionId { get; init; }
            public int UserId { get; init; }
            public string? FirstName { get; init; }
            public string? LastName { get; init; }
            public DateTime ScheduledStartUtc { get; init; }
            public DateTime ScheduledEndUtc { get; init; }
            public PTSessionStatus Status { get; init; }
            public bool AttendanceRecorded { get; init; }
            public bool? MemberPresent { get; init; }
            public bool? IsNoShow { get; init; }
            public bool? IsLate { get; init; }
        }

        private static readonly System.Linq.Expressions.Expression<Func<PTSession, PtRow>> PtProjection =
            s => new PtRow
            {
                SessionId = s.Id,
                UserId = s.UserId,
                FirstName = s.User.FirstName,
                LastName = s.User.LastName,
                ScheduledStartUtc = s.ScheduledStartUtc,
                ScheduledEndUtc = s.ScheduledEndUtc,
                Status = s.Status,
                AttendanceRecorded = s.Attendance != null && !s.Attendance.IsDeleted,
                MemberPresent = s.Attendance != null && !s.Attendance.IsDeleted ? s.Attendance.MemberPresent : null,
                IsNoShow = s.Attendance != null && !s.Attendance.IsDeleted ? s.Attendance.IsNoShow : null,
                IsLate = s.Attendance != null && !s.Attendance.IsDeleted ? s.Attendance.IsLate : null,
            };

        private static TrainerTodayPtSessionDto MapPt(PtRow row) => new()
        {
            SessionId = row.SessionId,
            UserId = row.UserId,
            MemberName = $"{row.FirstName} {row.LastName}".Trim(),
            ScheduledStartUtc = DateTime.SpecifyKind(row.ScheduledStartUtc, DateTimeKind.Utc),
            ScheduledEndUtc = DateTime.SpecifyKind(row.ScheduledEndUtc, DateTimeKind.Utc),
            Status = row.Status.ToString(),
            AttendanceRecorded = row.AttendanceRecorded,
            MemberPresent = row.MemberPresent,
            IsNoShow = row.IsNoShow,
            IsLate = row.IsLate,
        };
    }
}
