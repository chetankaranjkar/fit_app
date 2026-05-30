using GymManagement.Core.DTOs.WorkoutTracking;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class WorkoutTrackingService : IWorkoutTrackingService
{
    private readonly ApplicationDbContext _db;

    public WorkoutTrackingService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<int?> ResolveMemberIdForUserAsync(int userId, CancellationToken ct = default)
    {
        var member = await _db.Members.AsNoTracking()
            .FirstOrDefaultAsync(m => m.UserId == userId && !m.IsDeleted, ct);
        return member?.Id;
    }

    public async Task<ActiveWorkoutSessionDto> StartAsync(StartWorkoutRequestDto dto, int? callerUserId, CancellationToken ct = default)
    {
        var (member, userId) = await ResolveMemberAsync(dto.MemberId, ct);
        await EnsureCanAccessMemberAsync(member.Id, userId, callerUserId, ct);

        var existing = await FindActiveSessionEntityAsync(member.Id, ct);
        if (existing != null)
        {
            var existingPlanName = existing.WorkoutPlanId.HasValue
                ? await _db.WorkoutPlans.AsNoTracking()
                    .Where(p => p.Id == existing.WorkoutPlanId)
                    .Select(p => p.Name)
                    .FirstOrDefaultAsync(ct)
                : null;
            return await MapActiveSessionAsync(existing.Id, existingPlanName, ct)
                ?? throw new InvalidOperationException("Failed to load active session.");
        }

        if (!dto.WorkoutPlanId.HasValue || dto.WorkoutPlanId <= 0)
            throw new InvalidOperationException("WorkoutPlanId is required to start a tracked session.");

        var plan = await _db.WorkoutPlans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.WorkoutPlanId && !p.IsDeleted && p.IsActive, ct)
            ?? throw new NotFoundException("Workout plan not found.");

        var lineEntities = await LoadPlanExercisesForTodayAsync(dto.WorkoutPlanId.Value, userId, dto.UtcOffsetMinutes, ct);
        if (lineEntities.Count == 0)
            throw new InvalidOperationException("No exercises scheduled for today on this plan.");

        var now = DateTime.UtcNow;
        var localToday = now.AddMinutes(dto.UtcOffsetMinutes ?? 0).Date;

        var session = new WorkoutSession
        {
            UserId = userId,
            MemberId = member.Id,
            WorkoutPlanId = dto.WorkoutPlanId,
            SessionDate = now,
            WorkoutDate = localToday,
            SessionStartUtc = now,
            Status = WorkoutSessionStatus.InProgress,
            IsCompleted = false,
            CreatedDate = now,
        };

        await _db.WorkoutSessions.AddAsync(session, ct);
        await _db.SaveChangesAsync(ct);

        var rows = new List<WorkoutSessionExercise>();
        foreach (var wpe in lineEntities)
        {
            for (var set = 1; set <= Math.Max(1, wpe.Sets); set++)
            {
                rows.Add(new WorkoutSessionExercise
                {
                    WorkoutSessionId = session.Id,
                    ExerciseId = wpe.ExerciseId,
                    ExerciseName = wpe.Exercise.Name,
                    SetNumber = set,
                    TargetReps = wpe.Reps,
                    TargetWeight = wpe.Weight,
                    RestSeconds = wpe.RestBetweenSets,
                    IsCompleted = false,
                    CreatedAt = now,
                });
            }
        }

        await _db.WorkoutSessionExercises.AddRangeAsync(rows, ct);
        await _db.SaveChangesAsync(ct);

        return await MapActiveSessionAsync(session.Id, plan.Name, ct)
            ?? throw new InvalidOperationException("Failed to load started session.");
    }

    public async Task<ActiveWorkoutActiveResponseDto?> GetActiveAsync(int memberId, int? callerUserId, CancellationToken ct = default)
    {
        var (member, userId) = await ResolveMemberAsync(memberId, ct);
        await EnsureCanAccessMemberAsync(member.Id, userId, callerUserId, ct);

        var session = await FindActiveSessionEntityAsync(member.Id, ct);
        if (session == null) return null;

        var planName = session.WorkoutPlanId.HasValue
            ? await _db.WorkoutPlans.AsNoTracking()
                .Where(p => p.Id == session.WorkoutPlanId)
                .Select(p => p.Name)
                .FirstOrDefaultAsync(ct)
            : null;

        var mapped = await MapActiveSessionAsync(session.Id, planName, ct);
        if (mapped == null) return null;

        var now = DateTime.UtcNow;
        mapped.LastSyncedAt = session.UpdatedDate ?? session.SessionStartUtc ?? now;
        mapped.ServerTimeUtc = now;
        mapped.PendingOfflineChanges = false;

        return new ActiveWorkoutActiveResponseDto
        {
            Session = mapped,
            CompletionPercent = mapped.CompletionPercent,
            LastSyncedAt = mapped.LastSyncedAt,
            PendingOfflineChanges = false,
            ServerTimeUtc = now,
        };
    }

    public async Task<WorkoutSessionExerciseDto> LogSetAsync(LogWorkoutSetRequestDto dto, int? callerUserId, CancellationToken ct = default)
    {
        var row = await _db.WorkoutSessionExercises
            .Include(x => x.WorkoutSession)
            .FirstOrDefaultAsync(x => x.Id == dto.WorkoutSessionExerciseId, ct)
            ?? throw new NotFoundException("Workout set not found.");

        var session = row.WorkoutSession;
        if (session.IsDeleted || session.Status != WorkoutSessionStatus.InProgress)
            throw new ConflictException("Workout session is not in progress.");

        if (session.MemberId == null)
            throw new InvalidOperationException("Session has no member.");

        await EnsureCanAccessMemberAsync(session.MemberId.Value, session.UserId ?? 0, callerUserId, ct);

        if (dto.IsCompleted)
        {
            var reps = dto.ActualReps ?? row.ActualReps;
            var weight = dto.ActualWeight ?? row.ActualWeight;
            if (!reps.HasValue || reps.Value <= 0)
                throw new BadRequestException("Actual reps are required and must be greater than zero to complete a set.");
            if (!weight.HasValue || weight.Value < 0)
                throw new BadRequestException("Actual weight is required and cannot be negative to complete a set.");
        }

        if (dto.ActualReps.HasValue) row.ActualReps = dto.ActualReps;
        if (dto.ActualWeight.HasValue) row.ActualWeight = dto.ActualWeight;
        if (dto.DurationSeconds.HasValue) row.DurationSeconds = dto.DurationSeconds;
        if (dto.RestSeconds.HasValue) row.RestSeconds = dto.RestSeconds;

        var wasCompleted = row.IsCompleted;
        row.IsCompleted = dto.IsCompleted;
        if (dto.IsCompleted && !wasCompleted)
        {
            row.CompletedAt = DateTime.UtcNow;
            row.CompletedByUserId = callerUserId;
        }
        else if (!dto.IsCompleted)
        {
            row.CompletedAt = null;
            row.CompletedByUserId = null;
        }

        if (dto.Notes != null) row.Notes = dto.Notes.Trim();

        session.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return MapExerciseRow(row);
    }

    public async Task<ActiveWorkoutSessionDto> CompleteAsync(int sessionId, int? callerUserId, decimal? caloriesBurned, CancellationToken ct = default)
    {
        var session = await _db.WorkoutSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted, ct)
            ?? throw new NotFoundException("Workout session not found.");

        if (session.MemberId == null)
            throw new InvalidOperationException("Session has no member.");

        await EnsureCanAccessMemberAsync(session.MemberId.Value, session.UserId ?? 0, callerUserId, ct);

        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new ConflictException("Session is not in progress.");

        var sets = await _db.WorkoutSessionExercises
            .Where(x => x.WorkoutSessionId == sessionId)
            .ToListAsync(ct);

        var (completion, volume) = CalculateProgress(sets);
        var now = DateTime.UtcNow;

        session.Status = WorkoutSessionStatus.Completed;
        session.IsCompleted = true;
        session.SessionEndUtc = now;
        session.CompletionPercent = completion;
        session.TotalVolume = volume;
        session.CaloriesBurned = caloriesBurned;
        session.DurationMinutes = session.SessionStartUtc.HasValue
            ? (int?)Math.Max(1, (now - session.SessionStartUtc.Value).TotalMinutes)
            : session.DurationMinutes;
        session.UpdatedDate = now;

        await SyncWorkoutLogsFromSessionAsync(session, sets, ct);
        await _db.SaveChangesAsync(ct);

        var planName = session.WorkoutPlanId.HasValue
            ? await _db.WorkoutPlans.AsNoTracking().Where(p => p.Id == session.WorkoutPlanId).Select(p => p.Name).FirstOrDefaultAsync(ct)
            : null;

        return await MapActiveSessionAsync(session.Id, planName, ct)
            ?? throw new InvalidOperationException("Failed to load completed session.");
    }

    public async Task<WorkoutExerciseHistoryDto> GetExerciseHistoryAsync(
        int memberId, int exerciseId, int? callerUserId, int take = 50, CancellationToken ct = default)
    {
        var (member, userId) = await ResolveMemberAsync(memberId, ct);
        await EnsureCanAccessMemberAsync(member.Id, userId, callerUserId, ct);

        take = Math.Clamp(take, 1, 200);

        var rows = await (
            from se in _db.WorkoutSessionExercises.AsNoTracking()
            join ws in _db.WorkoutSessions.AsNoTracking() on se.WorkoutSessionId equals ws.Id
            where ws.MemberId == member.Id
                  && !ws.IsDeleted
                  && se.ExerciseId == exerciseId
                  && (ws.Status == WorkoutSessionStatus.Completed || ws.IsCompleted)
                  && se.IsCompleted
                  && se.ActualReps != null
            orderby ws.SessionDate descending, se.SetNumber
            select new
            {
                ws.Id,
                ws.SessionDate,
                se.SetNumber,
                se.ActualWeight,
                se.ActualReps,
                se.ExerciseName,
            }).Take(take * 5).ToListAsync(ct);

        var exerciseName = rows.FirstOrDefault()?.ExerciseName
            ?? await _db.Exercises.AsNoTracking().Where(e => e.Id == exerciseId).Select(e => e.Name).FirstOrDefaultAsync(ct)
            ?? "Exercise";

        var entries = new List<WorkoutExerciseHistoryEntryDto>();
        decimal bestVolume = 0;
        decimal? bestWeight = null;
        int? bestReps = null;
        decimal? priorVolume = null;

        foreach (var r in rows.OrderBy(x => x.SessionDate).ThenBy(x => x.SetNumber).Take(take * 3))
        {
            var reps = r.ActualReps ?? 0;
            var weight = r.ActualWeight ?? 0;
            var volume = weight * reps;
            if (volume > bestVolume)
            {
                bestVolume = volume;
                bestWeight = r.ActualWeight;
                bestReps = r.ActualReps;
            }

            var improved = priorVolume.HasValue && volume > priorVolume.Value;
            entries.Add(new WorkoutExerciseHistoryEntryDto
            {
                SessionId = r.Id,
                WorkoutDateUtc = r.SessionDate,
                SetNumber = r.SetNumber,
                Weight = r.ActualWeight,
                Reps = r.ActualReps,
                Volume = volume,
                IsPersonalRecord = false,
                IsImprovement = improved,
            });
            priorVolume = volume;
        }

        var maxVol = entries.Count == 0 ? 0m : entries.Max(e => e.Volume);
        foreach (var e in entries)
        {
            if (e.Volume >= maxVol && maxVol > 0)
                e.IsPersonalRecord = true;
        }

        entries = entries.OrderByDescending(e => e.WorkoutDateUtc).ThenByDescending(e => e.SetNumber).Take(take).ToList();

        return new WorkoutExerciseHistoryDto
        {
            ExerciseId = exerciseId,
            ExerciseName = exerciseName,
            BestWeight = bestWeight,
            BestReps = bestReps,
            BestVolume = bestVolume > 0 ? bestVolume : null,
            Entries = entries,
        };
    }

    public async Task<WorkoutDashboardDto> GetDashboardAsync(int memberId, int? callerUserId, CancellationToken ct = default)
    {
        var (member, userId) = await ResolveMemberAsync(memberId, ct);
        await EnsureCanAccessMemberAsync(member.Id, userId, callerUserId, ct);

        var completed = await _db.WorkoutSessions.AsNoTracking()
            .Where(s => s.MemberId == member.Id && !s.IsDeleted
                && (s.Status == WorkoutSessionStatus.Completed || s.IsCompleted))
            .OrderByDescending(s => s.SessionDate)
            .Select(s => new { s.SessionDate, s.CompletionPercent })
            .ToListAsync(ct);

        var weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
        var workoutsThisWeek = completed.Count(c => c.SessionDate >= weekStart);
        var avgCompletion = completed.Count == 0
            ? 0m
            : completed.Where(c => c.CompletionPercent.HasValue).Select(c => c.CompletionPercent!.Value).DefaultIfEmpty(0).Average();

        var activeEnvelope = await GetActiveAsync(member.Id, callerUserId, ct);

        return new WorkoutDashboardDto
        {
            MemberId = member.Id,
            CurrentStreakDays = CalculateStreak(completed.Select(c => c.SessionDate.Date).Distinct().OrderByDescending(d => d).ToList()),
            TotalWorkouts = completed.Count,
            WorkoutsThisWeek = workoutsThisWeek,
            LastWorkoutDateUtc = completed.FirstOrDefault()?.SessionDate,
            AverageCompletionPercent = Math.Round(avgCompletion, 1),
            ActiveSession = activeEnvelope?.Session,
        };
    }

    public async Task<MemberWorkoutTimelineDto> GetMemberTimelineForTrainerAsync(
        int trainerUserId, int memberId, int take = 40, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        var (member, userId) = await ResolveMemberAsync(memberId, ct);
        await EnsureTrainerCanAccessMemberAsync(trainerUserId, member.Id, userId, ct);

        var userMap = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.FirstName, u.LastName })
            .FirstOrDefaultAsync(ct);
        var memberName = userMap == null
            ? $"Member #{member.Id}"
            : $"{userMap.FirstName} {userMap.LastName}".Trim();

        var sessions = await _db.WorkoutSessions.AsNoTracking()
            .Where(s => s.MemberId == member.Id && !s.IsDeleted)
            .OrderByDescending(s => s.SessionDate)
            .Take(take)
            .ToListAsync(ct);

        var summaries = await MapSessionSummariesAsync(sessions, ct);
        var weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
        var weekSessions = sessions.Where(s => s.SessionDate >= weekStart).ToList();
        var completedWeek = weekSessions.Count(s =>
            s.Status == WorkoutSessionStatus.Completed || s.IsCompleted);
        var adherence = weekSessions.Count == 0
            ? 0m
            : Math.Round(100m * completedWeek / weekSessions.Count, 1);

        return new MemberWorkoutTimelineDto
        {
            MemberId = member.Id,
            MemberName = memberName,
            Sessions = summaries,
            AdherencePercent = adherence,
            CompletedThisWeek = completedWeek,
        };
    }

    public async Task<WorkoutSessionDetailDto> GetSessionDetailAsync(int sessionId, int? callerUserId, CancellationToken ct = default)
    {
        var session = await _db.WorkoutSessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted, ct)
            ?? throw new NotFoundException("Workout session not found.");

        if (session.MemberId == null)
            throw new InvalidOperationException("Session has no member.");

        await EnsureCanAccessMemberAsync(session.MemberId.Value, session.UserId ?? 0, callerUserId, ct);

        var planName = session.WorkoutPlanId.HasValue
            ? await _db.WorkoutPlans.AsNoTracking()
                .Where(p => p.Id == session.WorkoutPlanId)
                .Select(p => p.Name)
                .FirstOrDefaultAsync(ct)
            : null;

        var mapped = await MapActiveSessionAsync(session.Id, planName, ct)
            ?? throw new NotFoundException("Workout session not found.");

        var sets = await _db.WorkoutSessionExercises.AsNoTracking()
            .Where(x => x.WorkoutSessionId == sessionId)
            .ToListAsync(ct);

        var completedExercises = sets
            .Where(s => s.IsCompleted)
            .Select(s => s.ExerciseId)
            .Distinct()
            .Count();

        var totalExercises = sets.Select(s => s.ExerciseId).Distinct().Count();
        var adherence = totalExercises == 0
            ? 0m
            : Math.Round(100m * completedExercises / totalExercises, 1);

        var duration = session.DurationMinutes;
        if (!duration.HasValue && session.SessionStartUtc.HasValue && session.SessionEndUtc.HasValue)
        {
            duration = Math.Max(1, (int)(session.SessionEndUtc.Value - session.SessionStartUtc.Value).TotalMinutes);
        }

        return new WorkoutSessionDetailDto
        {
            Session = mapped,
            DurationMinutes = duration ?? 0,
            CompletedExercises = completedExercises,
            TotalVolume = mapped.TotalVolume,
            AdherencePercent = adherence,
        };
    }

    public async Task<WorkoutAdminMonitoringDto> GetAdminMonitoringAsync(int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var today = DateTime.UtcNow.Date;

        var activeEntities = await _db.WorkoutSessions.AsNoTracking()
            .Where(s => !s.IsDeleted && s.Status == WorkoutSessionStatus.InProgress && s.MemberId != null)
            .OrderByDescending(s => s.SessionStartUtc ?? s.SessionDate)
            .Take(take)
            .ToListAsync(ct);

        var completedToday = await _db.WorkoutSessions.AsNoTracking()
            .CountAsync(s => !s.IsDeleted
                && (s.Status == WorkoutSessionStatus.Completed || s.IsCompleted)
                && s.SessionDate >= today, ct);

        var recentCompleted = await _db.WorkoutSessions.AsNoTracking()
            .Where(s => !s.IsDeleted && (s.Status == WorkoutSessionStatus.Completed || s.IsCompleted))
            .OrderByDescending(s => s.SessionDate)
            .Take(take)
            .ToListAsync(ct);

        return new WorkoutAdminMonitoringDto
        {
            ActiveLiveSessions = activeEntities.Count,
            CompletedToday = completedToday,
            ActiveSessions = await MapSessionSummariesAsync(activeEntities, ct),
            RecentCompleted = await MapSessionSummariesAsync(recentCompleted, ct),
        };
    }

    public async Task<IReadOnlyList<MemberWorkoutSummaryDto>> GetMemberSummariesForTrainerAsync(
        int trainerUserId, int take = 30, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        var trainer = await _db.Trainers.AsNoTracking()
            .FirstOrDefaultAsync(t => t.UserId == trainerUserId && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Trainer profile not found.");

        var memberUserIds = await _db.UserInstructors.AsNoTracking()
            .Where(ui => ui.TrainerId == trainer.Id && !ui.IsDeleted)
            .Select(ui => ui.UserId)
            .Distinct()
            .ToListAsync(ct);

        if (memberUserIds.Count == 0)
            return Array.Empty<MemberWorkoutSummaryDto>();

        var members = await _db.Members.AsNoTracking()
            .Where(m => memberUserIds.Contains(m.UserId) && !m.IsDeleted)
            .ToListAsync(ct);

        var memberIds = members.Select(m => m.Id).ToList();
        var userMap = await _db.Users.AsNoTracking()
            .Where(u => memberUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), ct);

        var sessions = await _db.WorkoutSessions.AsNoTracking()
            .Where(s => s.MemberId != null && memberIds.Contains(s.MemberId.Value) && !s.IsDeleted)
            .OrderByDescending(s => s.SessionDate)
            .Take(take * 3)
            .ToListAsync(ct);

        var planIds = sessions.Where(s => s.WorkoutPlanId.HasValue).Select(s => s.WorkoutPlanId!.Value).Distinct().ToList();
        var planNames = planIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.WorkoutPlans.AsNoTracking()
                .Where(p => planIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return sessions
            .Where(s => s.MemberId.HasValue)
            .GroupBy(s => s.MemberId!.Value)
            .Select(g =>
            {
                var latest = g.OrderByDescending(x => x.SessionDate).First();
                var m = members.First(x => x.Id == g.Key);
                userMap.TryGetValue(m.UserId, out var name);
                return new MemberWorkoutSummaryDto
                {
                    SessionId = latest.Id,
                    MemberId = m.Id,
                    MemberName = name ?? $"Member #{m.Id}",
                    PlanName = latest.WorkoutPlanId.HasValue && planNames.TryGetValue(latest.WorkoutPlanId.Value, out var pn) ? pn : null,
                    SessionDateUtc = latest.SessionDate,
                    Status = latest.Status ?? (latest.IsCompleted ? WorkoutSessionStatus.Completed : WorkoutSessionStatus.InProgress),
                    CompletionPercent = latest.CompletionPercent,
                    TotalVolume = latest.TotalVolume,
                };
            })
            .OrderByDescending(x => x.SessionDateUtc)
            .Take(take)
            .ToList();
    }

    private async Task SyncWorkoutLogsFromSessionAsync(
        WorkoutSession session, List<WorkoutSessionExercise> sets, CancellationToken ct)
    {
        if (!session.WorkoutPlanId.HasValue || session.UserId == null) return;

        foreach (var s in sets.Where(x => x.IsCompleted && x.ActualReps.HasValue))
        {
            await _db.WorkoutLogs.AddAsync(new WorkoutLog
            {
                WorkoutSessionId = session.Id,
                ExerciseId = s.ExerciseId,
                SetNumber = s.SetNumber,
                RepsDone = s.ActualReps!.Value,
                WeightUsed = s.ActualWeight,
                Notes = s.Notes,
                CreatedDate = DateTime.UtcNow,
            }, ct);
        }
    }

    private async Task<WorkoutSession?> FindActiveSessionEntityAsync(int memberId, CancellationToken ct) =>
        await _db.WorkoutSessions
            .Where(s => s.MemberId == memberId && !s.IsDeleted && s.Status == WorkoutSessionStatus.InProgress)
            .OrderByDescending(s => s.SessionStartUtc ?? s.SessionDate)
            .FirstOrDefaultAsync(ct);

    private async Task<ActiveWorkoutSessionDto?> MapActiveSessionAsync(int sessionId, string? planName, CancellationToken ct)
    {
        var session = await _db.WorkoutSessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session == null || session.MemberId == null) return null;

        var sets = await _db.WorkoutSessionExercises.AsNoTracking()
            .Where(x => x.WorkoutSessionId == sessionId)
            .OrderBy(x => x.ExerciseId).ThenBy(x => x.SetNumber)
            .ToListAsync(ct);

        var (completion, volume) = CalculateProgress(sets);
        var completedSets = sets.Count(s => s.IsCompleted);
        var groups = sets
            .GroupBy(s => new { s.ExerciseId, s.ExerciseName })
            .Select(g => new WorkoutSessionGroupDto
            {
                ExerciseId = g.Key.ExerciseId,
                ExerciseName = g.Key.ExerciseName,
                Sets = g.Select(MapExerciseRow).ToList(),
            })
            .ToList();

        return new ActiveWorkoutSessionDto
        {
            SessionId = session.Id,
            MemberId = session.MemberId.Value,
            WorkoutPlanId = session.WorkoutPlanId,
            PlanName = planName,
            Status = session.Status ?? (session.IsCompleted ? WorkoutSessionStatus.Completed : WorkoutSessionStatus.InProgress),
            WorkoutDate = session.WorkoutDate ?? session.SessionDate.Date,
            StartTimeUtc = session.SessionStartUtc ?? session.SessionDate,
            CompletionPercent = session.CompletionPercent ?? completion,
            CompletedSets = completedSets,
            TotalSets = sets.Count,
            TotalVolume = session.TotalVolume ?? volume,
            Exercises = groups,
        };
    }

    private static (decimal completionPercent, decimal totalVolume) CalculateProgress(IReadOnlyList<WorkoutSessionExercise> sets)
    {
        if (sets.Count == 0) return (0, 0);
        var completed = sets.Count(s => s.IsCompleted);
        var completion = Math.Round(100m * completed / sets.Count, 1);
        var volume = sets
            .Where(s => s.IsCompleted && s.ActualReps.HasValue)
            .Sum(s => (s.ActualWeight ?? 0) * s.ActualReps!.Value);
        return (completion, volume);
    }

    private static WorkoutSessionExerciseDto MapExerciseRow(WorkoutSessionExercise s) =>
        new()
        {
            Id = s.Id,
            ExerciseId = s.ExerciseId,
            ExerciseName = s.ExerciseName,
            SetNumber = s.SetNumber,
            TargetReps = s.TargetReps,
            ActualReps = s.ActualReps,
            TargetWeight = s.TargetWeight,
            ActualWeight = s.ActualWeight,
            DurationSeconds = s.DurationSeconds,
            RestSeconds = s.RestSeconds,
            IsCompleted = s.IsCompleted,
            Notes = s.Notes,
            CompletedAt = s.CompletedAt,
            CompletedByUserId = s.CompletedByUserId,
            SetVolume = s.IsCompleted && s.ActualReps.HasValue
                ? (s.ActualWeight ?? 0) * s.ActualReps.Value
                : null,
        };

    private async Task<List<WorkoutPlanExercise>> LoadPlanExercisesForTodayAsync(
        int planId, int userId, int? utcOffsetMinutes, CancellationToken ct)
    {
        var allLines = await _db.WorkoutPlanExercises.AsNoTracking()
            .Where(e => e.WorkoutPlanId == planId && !e.IsDeleted)
            .Include(e => e.Exercise)
            .OrderBy(e => e.Order)
            .ToListAsync(ct);

        var planDays = await _db.WorkoutPlanDays.AsNoTracking()
            .Where(d => d.WorkoutPlanId == planId)
            .ToListAsync(ct);

        var localDow = DateTime.UtcNow.AddMinutes(utcOffsetMinutes ?? 0).DayOfWeek;
        var isoWeekday = localDow == DayOfWeek.Sunday ? 7 : (int)localDow;
        var targetPlanDay = planDays.FirstOrDefault(d => d.DayNumber == isoWeekday);
        var hasDayAssigned = allLines.Any(e => e.WorkoutPlanDayId != null);

        if (hasDayAssigned && targetPlanDay != null)
        {
            if (targetPlanDay.IsRestDay) return new List<WorkoutPlanExercise>();
            var forDay = allLines.Where(e => e.WorkoutPlanDayId == targetPlanDay.Id).OrderBy(e => e.Order).ToList();
            if (forDay.Count > 0) return forDay;
        }

        return allLines;
    }

    private async Task<(Member member, int userId)> ResolveMemberAsync(int memberOrUserId, CancellationToken ct)
    {
        var byId = await _db.Members.FirstOrDefaultAsync(m => m.Id == memberOrUserId && !m.IsDeleted, ct);
        if (byId != null) return (byId, byId.UserId);

        var byUser = await _db.Members.FirstOrDefaultAsync(m => m.UserId == memberOrUserId && !m.IsDeleted, ct);
        if (byUser != null) return (byUser, byUser.UserId);

        throw new NotFoundException("Member not found.");
    }

    private async Task EnsureCanAccessMemberAsync(int memberId, int memberUserId, int? callerUserId, CancellationToken ct)
    {
        if (!callerUserId.HasValue) return;
        if (callerUserId.Value == memberUserId) return;

        var isTrainer = await _db.Trainers.AsNoTracking()
            .AnyAsync(t => t.UserId == callerUserId.Value && !t.IsDeleted, ct);
        if (!isTrainer) throw new UnauthorizedAccessException("Not allowed to access this member's workouts.");

        var trainer = await _db.Trainers.AsNoTracking()
            .FirstAsync(t => t.UserId == callerUserId.Value && !t.IsDeleted, ct);

        var assigned = await _db.UserInstructors.AsNoTracking()
            .AnyAsync(ui => ui.TrainerId == trainer.Id && ui.UserId == memberUserId && !ui.IsDeleted, ct);

        var hasAdmin = await (
            from ur in _db.UserRoles.AsNoTracking()
            join r in _db.AppRoles.AsNoTracking() on ur.RoleId equals r.Id
            where ur.UserId == callerUserId.Value && r.Name == "ADMIN"
            select ur).AnyAsync(ct);

        if (!assigned && !hasAdmin)
            throw new UnauthorizedAccessException("Trainer is not assigned to this member.");
    }

    private static int CalculateStreak(List<DateTime> workoutDates)
    {
        if (workoutDates.Count == 0) return 0;
        var today = DateTime.UtcNow.Date;
        var cursor = workoutDates.Contains(today) ? today : today.AddDays(-1);
        if (!workoutDates.Contains(cursor)) return 0;

        var streak = 0;
        while (workoutDates.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }

    private async Task EnsureTrainerCanAccessMemberAsync(
        int trainerUserId, int memberId, int memberUserId, CancellationToken ct)
    {
        await EnsureCanAccessMemberAsync(memberId, memberUserId, trainerUserId, ct);
    }

    private async Task<IReadOnlyList<MemberWorkoutSummaryDto>> MapSessionSummariesAsync(
        List<WorkoutSession> sessions, CancellationToken ct)
    {
        if (sessions.Count == 0) return Array.Empty<MemberWorkoutSummaryDto>();

        var memberIds = sessions.Where(s => s.MemberId.HasValue).Select(s => s.MemberId!.Value).Distinct().ToList();
        var members = await _db.Members.AsNoTracking()
            .Where(m => memberIds.Contains(m.Id))
            .ToListAsync(ct);
        var userIds = members.Select(m => m.UserId).ToList();
        var userMap = await _db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), ct);

        var planIds = sessions.Where(s => s.WorkoutPlanId.HasValue).Select(s => s.WorkoutPlanId!.Value).Distinct().ToList();
        var planNames = planIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.WorkoutPlans.AsNoTracking()
                .Where(p => planIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return sessions
            .Where(s => s.MemberId.HasValue)
            .Select(s =>
            {
                var m = members.First(x => x.Id == s.MemberId!.Value);
                userMap.TryGetValue(m.UserId, out var name);
                return new MemberWorkoutSummaryDto
                {
                    SessionId = s.Id,
                    MemberId = m.Id,
                    MemberName = name ?? $"Member #{m.Id}",
                    PlanName = s.WorkoutPlanId.HasValue && planNames.TryGetValue(s.WorkoutPlanId.Value, out var pn) ? pn : null,
                    SessionDateUtc = s.SessionDate,
                    Status = s.Status ?? (s.IsCompleted ? WorkoutSessionStatus.Completed : WorkoutSessionStatus.InProgress),
                    CompletionPercent = s.CompletionPercent,
                    TotalVolume = s.TotalVolume,
                };
            })
            .ToList();
    }
}
