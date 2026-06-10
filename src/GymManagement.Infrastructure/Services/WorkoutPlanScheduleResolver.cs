using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class WorkoutPlanScheduleResolver
{
    private readonly ApplicationDbContext _db;
    private readonly IWorkoutPlanEngine _engine;

    public WorkoutPlanScheduleResolver(ApplicationDbContext db, IWorkoutPlanEngine engine)
    {
        _db = db;
        _engine = engine;
    }

    public async Task<(ResolvedWorkoutDay Resolved, List<WorkoutPlanWarmupDto> Warmups, List<WorkoutPlanStretchDto> Stretches)>
        ResolveForUserAsync(int planId, int userId, DateTime asOfUtc, int utcOffsetMinutes, CancellationToken ct = default)
    {
        var plan = await _db.WorkoutPlans.AsNoTracking()
            .FirstAsync(p => p.Id == planId && !p.IsDeleted, ct);

        var programStart = await _db.UserSchedules.AsNoTracking()
            .Where(s => s.UserId == userId && s.WorkoutPlanId == planId && s.IsActive)
            .OrderBy(s => s.CreatedDate)
            .Select(s => (DateTime?)s.CreatedDate)
            .FirstOrDefaultAsync(ct) ?? plan.CreatedDate;

        var weeks = await _db.WorkoutPlanWeeks.AsNoTracking()
            .Where(w => w.WorkoutPlanId == planId && !w.IsDeleted)
            .OrderBy(w => w.WeekNumber)
            .ToListAsync(ct);

        var days = await _db.WorkoutPlanDays.AsNoTracking()
            .Where(d => d.WorkoutPlanId == planId && !d.IsDeleted)
            .ToListAsync(ct);

        var exercises = await _db.WorkoutPlanExercises.AsNoTracking()
            .Where(e => e.WorkoutPlanId == planId && !e.IsDeleted)
            .ToListAsync(ct);

        var resolved = _engine.ResolveToday(new WorkoutPlanScheduleContext
        {
            Plan = plan,
            Weeks = weeks,
            Days = days,
            Exercises = exercises,
            ProgramStartDate = programStart,
            AsOfUtc = asOfUtc,
            UtcOffsetMinutes = utcOffsetMinutes,
        });

        if (resolved.IsRestDay)
            return (resolved, new List<WorkoutPlanWarmupDto>(), new List<WorkoutPlanStretchDto>());

        var warmups = await ResolveDayWarmupsAsync(plan, resolved.PlanDay?.Id, ct);
        var stretches = await ResolveDayStretchesAsync(plan, resolved.PlanDay?.Id, ct);
        return (resolved, warmups, stretches);
    }

    private async Task<List<WorkoutPlanWarmupDto>> ResolveDayWarmupsAsync(WorkoutPlan plan, int? dayId, CancellationToken ct)
    {
        if (dayId is > 0)
        {
            var dayLinks = await _db.WorkoutPlanWarmups.AsNoTracking()
                .Where(pw => pw.WorkoutPlanId == plan.Id && pw.WorkoutPlanDayId == dayId && !pw.IsDeleted)
                .OrderBy(pw => pw.DisplayOrder)
                .ToListAsync(ct);
            if (dayLinks.Count > 0)
                return await MapWarmupLinksAsync(dayLinks, ct);
        }

        if (plan.UseDefaultWarmups && plan.WorkoutCategoryId is > 0)
            return await MapCategoryWarmupsAsync(plan.WorkoutCategoryId.Value, ct);

        return await MapPlanLevelWarmupsAsync(plan.Id, ct);
    }

    private async Task<List<WorkoutPlanStretchDto>> ResolveDayStretchesAsync(WorkoutPlan plan, int? dayId, CancellationToken ct)
    {
        if (dayId is > 0)
        {
            var dayLinks = await _db.WorkoutPlanStretches.AsNoTracking()
                .Where(ps => ps.WorkoutPlanId == plan.Id && ps.WorkoutPlanDayId == dayId && !ps.IsDeleted)
                .OrderBy(ps => ps.DisplayOrder)
                .ToListAsync(ct);
            if (dayLinks.Count > 0)
                return await MapStretchLinksAsync(dayLinks, ct);
        }

        if (plan.UseDefaultStretches && plan.WorkoutCategoryId is > 0)
            return await MapCategoryStretchesAsync(plan.WorkoutCategoryId.Value, ct);

        return await MapPlanLevelStretchesAsync(plan.Id, ct);
    }

    private async Task<List<WorkoutPlanWarmupDto>> MapWarmupLinksAsync(List<WorkoutPlanWarmup> links, CancellationToken ct)
    {
        var catalog = await _db.Warmups.AsNoTracking()
            .Where(w => links.Select(l => l.WarmupId).Contains(w.Id) && !w.IsDeleted)
            .ToDictionaryAsync(w => w.Id, ct);
        return links.Where(l => catalog.ContainsKey(l.WarmupId)).Select(l =>
        {
            var w = catalog[l.WarmupId];
            return new WorkoutPlanWarmupDto
            {
                Id = l.Id, WarmupId = w.Id, Name = w.Name, Description = w.Description,
                VideoUrl = w.VideoUrl, DurationSeconds = w.DurationSeconds,
                DifficultyLevel = w.DifficultyLevel, BodyPart = w.BodyPart,
                CaloriesBurn = w.CaloriesBurn, DisplayOrder = l.DisplayOrder,
            };
        }).ToList();
    }

    private async Task<List<WorkoutPlanStretchDto>> MapStretchLinksAsync(List<WorkoutPlanStretch> links, CancellationToken ct)
    {
        var catalog = await _db.Stretches.AsNoTracking()
            .Where(s => links.Select(l => l.StretchId).Contains(s.Id) && !s.IsDeleted)
            .ToDictionaryAsync(s => s.Id, ct);
        return links.Where(l => catalog.ContainsKey(l.StretchId)).Select(l =>
        {
            var s = catalog[l.StretchId];
            return new WorkoutPlanStretchDto
            {
                Id = l.Id, StretchId = s.Id, Name = s.Name, Description = s.Description,
                VideoUrl = s.VideoUrl, DurationSeconds = s.DurationSeconds,
                DifficultyLevel = s.DifficultyLevel, BodyPart = s.BodyPart, DisplayOrder = l.DisplayOrder,
            };
        }).ToList();
    }

    private async Task<List<WorkoutPlanWarmupDto>> MapCategoryWarmupsAsync(int categoryId, CancellationToken ct)
    {
        var links = await _db.WorkoutCategoryWarmups.AsNoTracking()
            .Where(cw => cw.WorkoutCategoryId == categoryId && !cw.IsDeleted)
            .OrderBy(cw => cw.DisplayOrder)
            .ToListAsync(ct);
        var catalog = await _db.Warmups.AsNoTracking()
            .Where(w => links.Select(l => l.WarmupId).Contains(w.Id) && w.IsActive && !w.IsDeleted)
            .ToDictionaryAsync(w => w.Id, ct);
        return links.Where(l => catalog.ContainsKey(l.WarmupId)).Select(l =>
        {
            var w = catalog[l.WarmupId];
            return new WorkoutPlanWarmupDto
            {
                Id = l.Id, WarmupId = w.Id, Name = w.Name, Description = w.Description,
                VideoUrl = w.VideoUrl, DurationSeconds = w.DurationSeconds,
                DifficultyLevel = w.DifficultyLevel, BodyPart = w.BodyPart,
                CaloriesBurn = w.CaloriesBurn, DisplayOrder = l.DisplayOrder,
            };
        }).ToList();
    }

    private async Task<List<WorkoutPlanStretchDto>> MapCategoryStretchesAsync(int categoryId, CancellationToken ct)
    {
        var links = await _db.WorkoutCategoryStretches.AsNoTracking()
            .Where(cs => cs.WorkoutCategoryId == categoryId && !cs.IsDeleted)
            .OrderBy(cs => cs.DisplayOrder)
            .ToListAsync(ct);
        var catalog = await _db.Stretches.AsNoTracking()
            .Where(s => links.Select(l => l.StretchId).Contains(s.Id) && s.IsActive && !s.IsDeleted)
            .ToDictionaryAsync(s => s.Id, ct);
        return links.Where(l => catalog.ContainsKey(l.StretchId)).Select(l =>
        {
            var s = catalog[l.StretchId];
            return new WorkoutPlanStretchDto
            {
                Id = l.Id, StretchId = s.Id, Name = s.Name, Description = s.Description,
                VideoUrl = s.VideoUrl, DurationSeconds = s.DurationSeconds,
                DifficultyLevel = s.DifficultyLevel, BodyPart = s.BodyPart, DisplayOrder = l.DisplayOrder,
            };
        }).ToList();
    }

    private async Task<List<WorkoutPlanWarmupDto>> MapPlanLevelWarmupsAsync(int planId, CancellationToken ct)
    {
        var links = await _db.WorkoutPlanWarmups.AsNoTracking()
            .Where(pw => pw.WorkoutPlanId == planId && pw.WorkoutPlanDayId == null && !pw.IsDeleted)
            .OrderBy(pw => pw.DisplayOrder)
            .ToListAsync(ct);
        return await MapWarmupLinksAsync(links, ct);
    }

    private async Task<List<WorkoutPlanStretchDto>> MapPlanLevelStretchesAsync(int planId, CancellationToken ct)
    {
        var links = await _db.WorkoutPlanStretches.AsNoTracking()
            .Where(ps => ps.WorkoutPlanId == planId && ps.WorkoutPlanDayId == null && !ps.IsDeleted)
            .OrderBy(ps => ps.DisplayOrder)
            .ToListAsync(ct);
        return await MapStretchLinksAsync(links, ct);
    }
}
