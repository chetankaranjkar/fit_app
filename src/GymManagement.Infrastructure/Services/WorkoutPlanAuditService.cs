using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class WorkoutPlanAuditService : IWorkoutPlanAuditService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly ApplicationDbContext _db;
    private readonly IHttpContextAccessor _http;

    public WorkoutPlanAuditService(ApplicationDbContext db, IHttpContextAccessor http)
    {
        _db = db;
        _http = http;
    }

    public async Task LogAsync(
        WorkoutPlanAuditAction action,
        int? workoutPlanId,
        string workoutPlanName,
        int? assignedToUserId,
        int performedByUserId,
        string performedByUserName,
        string? changeDetails = null,
        string? snapshotJson = null,
        CancellationToken ct = default)
    {
        var (ip, device) = ReadRequestMeta();
        await _db.WorkoutPlanAuditLogs.AddAsync(new WorkoutPlanAuditLog
        {
            WorkoutPlanId = workoutPlanId,
            WorkoutPlanName = workoutPlanName,
            AssignedToUserId = assignedToUserId,
            Action = action,
            ChangeDetails = changeDetails,
            SnapshotJson = snapshotJson,
            PerformedByUserId = performedByUserId,
            PerformedByUserName = performedByUserName,
            PerformedDate = DateTime.UtcNow,
            IPAddress = ip,
            DeviceInfo = device,
            CreatedDate = DateTime.UtcNow,
        }, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<WorkoutPlanAuditLogDto>> ListAsync(
        WorkoutPlanAuditListQuery query,
        CancellationToken ct = default)
    {
        var q = _db.WorkoutPlanAuditLogs.AsNoTracking().AsQueryable();

        if (query.MemberUserId.HasValue)
            q = q.Where(l => l.AssignedToUserId == query.MemberUserId.Value);

        if (query.FromUtc.HasValue)
            q = q.Where(l => l.PerformedDate >= query.FromUtc.Value);

        if (query.ToUtc.HasValue)
            q = q.Where(l => l.PerformedDate <= query.ToUtc.Value);

        if (query.Action.HasValue)
            q = q.Where(l => l.Action == query.Action.Value);

        var take = Math.Clamp(query.Take, 1, 500);
        var rows = await q
            .OrderByDescending(l => l.PerformedDate)
            .Take(take)
            .ToListAsync(ct);

        var memberIds = rows
            .Where(r => r.AssignedToUserId.HasValue)
            .Select(r => r.AssignedToUserId!.Value)
            .Distinct()
            .ToList();

        var memberNames = memberIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.Users.AsNoTracking()
                .Where(u => memberIds.Contains(u.Id))
                .Select(u => new { u.Id, Name = (u.FirstName + " " + u.LastName).Trim() })
                .ToDictionaryAsync(x => x.Id, x => x.Name, ct);

        return rows.Select(r => new WorkoutPlanAuditLogDto
        {
            Id = r.Id,
            WorkoutPlanId = r.WorkoutPlanId,
            WorkoutPlanName = r.WorkoutPlanName,
            AssignedToUserId = r.AssignedToUserId,
            AssignedToUserName = r.AssignedToUserId.HasValue
                ? memberNames.GetValueOrDefault(r.AssignedToUserId.Value)
                : null,
            Action = r.Action,
            ChangeDetails = r.ChangeDetails,
            SnapshotJson = r.SnapshotJson,
            PerformedByUserId = r.PerformedByUserId,
            PerformedByUserName = r.PerformedByUserName,
            PerformedDate = r.PerformedDate,
        }).ToList();
    }

    public async Task<bool> DeletePersonalWorkoutPlanWithAuditAsync(
        int workoutPlanId,
        int performedByUserId,
        string performedByUserName,
        CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var plan = await _db.WorkoutPlans
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == workoutPlanId, ct);

            if (plan == null || plan.IsDeleted)
            {
                await tx.RollbackAsync(ct);
                return false;
            }

            if (!string.Equals(plan.PlanType, WorkoutPlanTypes.Personal, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Only personal workout plans use audited deletion.");

            var snapshotJson = await BuildDeleteSnapshotJsonAsync(plan, performedByUserId, performedByUserName, ct);
            var (ip, device) = ReadRequestMeta();

            var audit = new WorkoutPlanAuditLog
            {
                WorkoutPlanId = plan.Id,
                WorkoutPlanName = plan.Name,
                AssignedToUserId = plan.AssignedToUserId,
                Action = WorkoutPlanAuditAction.Deleted,
                SnapshotJson = snapshotJson,
                ChangeDetails = "Personal workout plan deleted with full snapshot.",
                PerformedByUserId = performedByUserId,
                PerformedByUserName = performedByUserName,
                PerformedDate = DateTime.UtcNow,
                IPAddress = ip,
                DeviceInfo = device,
                CreatedDate = DateTime.UtcNow,
            };
            await _db.WorkoutPlanAuditLogs.AddAsync(audit, ct);
            await _db.SaveChangesAsync(ct);

            if (audit.Id <= 0)
                throw new InvalidOperationException("Audit record was not saved.");

            var now = DateTime.UtcNow;
            var exercises = await _db.WorkoutPlanExercises
                .IgnoreQueryFilters()
                .Where(e => e.WorkoutPlanId == workoutPlanId && !e.IsDeleted)
                .ToListAsync(ct);
            foreach (var e in exercises)
            {
                e.IsDeleted = true;
                e.UpdatedDate = now;
            }

            var days = await _db.WorkoutPlanDays
                .IgnoreQueryFilters()
                .Where(d => d.WorkoutPlanId == workoutPlanId && !d.IsDeleted)
                .ToListAsync(ct);
            foreach (var d in days)
            {
                d.IsDeleted = true;
                d.UpdatedDate = now;
            }

            var weeks = await _db.WorkoutPlanWeeks
                .IgnoreQueryFilters()
                .Where(w => w.WorkoutPlanId == workoutPlanId && !w.IsDeleted)
                .ToListAsync(ct);
            foreach (var w in weeks)
            {
                w.IsDeleted = true;
                w.UpdatedDate = now;
            }

            var schedules = await _db.UserSchedules
                .IgnoreQueryFilters()
                .Where(s => s.WorkoutPlanId == workoutPlanId && !s.IsDeleted)
                .ToListAsync(ct);
            foreach (var s in schedules)
            {
                s.IsDeleted = true;
                s.IsActive = false;
                s.UpdatedDate = now;
            }

            plan.IsDeleted = true;
            plan.IsActive = false;
            plan.UpdatedDate = now;

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return true;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    private async Task<string> BuildDeleteSnapshotJsonAsync(
        WorkoutPlan plan,
        int deletedByUserId,
        string deletedByUserName,
        CancellationToken ct)
    {
        var planId = plan.Id;
        var memberUserId = plan.AssignedToUserId;

        var weeks = await _db.WorkoutPlanWeeks.AsNoTracking()
            .Where(w => w.WorkoutPlanId == planId && !w.IsDeleted)
            .OrderBy(w => w.WeekNumber)
            .ToListAsync(ct);

        var days = await _db.WorkoutPlanDays.AsNoTracking()
            .Where(d => d.WorkoutPlanId == planId && !d.IsDeleted)
            .OrderBy(d => d.OrderIndex)
            .ToListAsync(ct);

        var planExercises = await _db.WorkoutPlanExercises.AsNoTracking()
            .Where(e => e.WorkoutPlanId == planId && !e.IsDeleted)
            .OrderBy(e => e.Order)
            .ToListAsync(ct);

        var exerciseIds = planExercises.Select(e => e.ExerciseId).Distinct().ToList();
        var exercises = exerciseIds.Count == 0
            ? new List<Exercise>()
            : await _db.Exercises.AsNoTracking()
                .Where(ex => exerciseIds.Contains(ex.Id))
                .ToListAsync(ct);

        var exerciseSteps = exerciseIds.Count == 0
            ? new List<ExerciseStep>()
            : await _db.ExerciseSteps.AsNoTracking()
                .Where(s => exerciseIds.Contains(s.ExerciseId) && !s.IsDeleted)
                .ToListAsync(ct);

        IReadOnlyList<WorkoutSession> sessions = Array.Empty<WorkoutSession>();
        IReadOnlyList<WorkoutSessionExercise> sessionSets = Array.Empty<WorkoutSessionExercise>();
        if (memberUserId.HasValue)
        {
            sessions = await _db.WorkoutSessions.AsNoTracking()
                .Where(s => s.WorkoutPlanId == planId && s.UserId == memberUserId.Value)
                .ToListAsync(ct);

            var sessionIds = sessions.Select(s => s.Id).ToList();
            if (sessionIds.Count > 0)
            {
                sessionSets = await _db.WorkoutSessionExercises.AsNoTracking()
                    .Where(se => sessionIds.Contains(se.WorkoutSessionId))
                    .ToListAsync(ct);
            }
        }

        var payload = new
        {
            WorkoutPlan = plan,
            Weeks = weeks,
            Days = days,
            WorkoutPlanExercises = planExercises,
            Exercises = exercises,
            ExerciseSteps = exerciseSteps,
            ProgressSessions = sessions,
            ProgressSessionExercises = sessionSets,
            DeletedByUserId = deletedByUserId,
            DeletedByUserName = deletedByUserName,
            DeletedOn = DateTime.UtcNow,
        };

        return JsonSerializer.Serialize(payload, JsonOptions);
    }

    private (string? Ip, string? Device) ReadRequestMeta()
    {
        var ctx = _http.HttpContext;
        var ip = ctx?.Connection.RemoteIpAddress?.ToString();
        var device = ctx?.Request.Headers.UserAgent.ToString();
        if (device?.Length > 512)
            device = device[..512];
        return (ip, device);
    }
}
