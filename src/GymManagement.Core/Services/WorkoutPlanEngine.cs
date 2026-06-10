using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services;

public sealed class WorkoutPlanEngine : IWorkoutPlanEngine
{
    public int CalculateProgramDay(WorkoutPlan plan, DateTime programStartDate, DateTime asOfUtc, int utcOffsetMinutes)
    {
        var startLocal = programStartDate.AddMinutes(utcOffsetMinutes).Date;
        var asOfLocal = asOfUtc.AddMinutes(utcOffsetMinutes).Date;
        var elapsed = (asOfLocal - startLocal).Days + 1;
        if (elapsed < 1) elapsed = 1;
        var cap = plan.DurationDays > 0 ? plan.DurationDays : 30;
        return Math.Min(cap, elapsed);
    }

    public int CalculateProgramWeek(int programDay) =>
        programDay <= 0 ? 1 : ((programDay - 1) / 7) + 1;

    public int ResolveTemplateWeekNumber(WorkoutPlan plan, int programWeek)
    {
        var mode = WorkoutPlanTemplateModes.Normalize(plan.TemplateMode);
        if (mode == WorkoutPlanTemplateModes.Legacy)
            return Math.Max(1, programWeek);
        if (mode == WorkoutPlanTemplateModes.Simple)
            return 1;
        var count = Math.Max(1, plan.TemplateWeekCount);
        return ((Math.Max(1, programWeek) - 1) % count) + 1;
    }

    public ResolvedWorkoutDay ResolveToday(WorkoutPlanScheduleContext context)
    {
        var plan = context.Plan;
        var mode = WorkoutPlanTemplateModes.Normalize(plan.TemplateMode);
        var programDay = CalculateProgramDay(plan, context.ProgramStartDate, context.AsOfUtc, context.UtcOffsetMinutes);
        var programWeek = CalculateProgramWeek(programDay);
        var templateWeekNumber = ResolveTemplateWeekNumber(plan, programWeek);

        var isoWeekday = IsoWeekday(context.AsOfUtc, context.UtcOffsetMinutes);
        WorkoutPlanDay? targetDay;

        if (mode == WorkoutPlanTemplateModes.Legacy)
        {
            targetDay = context.Days.FirstOrDefault(d => d.DayNumber == isoWeekday);
        }
        else
        {
            var templateWeek = context.Weeks.FirstOrDefault(w => w.WeekNumber == templateWeekNumber);
            targetDay = templateWeek == null
                ? context.Days.FirstOrDefault(d => d.DayNumber == isoWeekday)
                : context.Days.FirstOrDefault(d => d.WorkoutPlanWeekId == templateWeek.Id && d.DayNumber == isoWeekday);
        }

        if (targetDay == null)
        {
            return new ResolvedWorkoutDay
            {
                CurrentProgramDay = programDay,
                CurrentProgramWeek = programWeek,
                ResolvedTemplateWeekNumber = templateWeekNumber,
                TemplateMode = mode,
            };
        }

        if (targetDay.IsRestDay)
        {
            return new ResolvedWorkoutDay
            {
                CurrentProgramDay = programDay,
                CurrentProgramWeek = programWeek,
                ResolvedTemplateWeekNumber = templateWeekNumber,
                PlanDay = targetDay,
                IsRestDay = true,
                TemplateMode = mode,
            };
        }

        var exercises = context.Exercises
            .Where(e => e.WorkoutPlanDayId == targetDay.Id)
            .OrderBy(e => e.Order)
            .ToList();

        if (exercises.Count == 0 && mode == WorkoutPlanTemplateModes.Legacy
            && !context.Exercises.Any(e => e.WorkoutPlanDayId != null))
        {
            exercises = context.Exercises.OrderBy(e => e.Order).ToList();
        }

        var estMinutes = targetDay.DurationMinutes ?? EstimateMinutes(exercises);

        return new ResolvedWorkoutDay
        {
            CurrentProgramDay = programDay,
            CurrentProgramWeek = programWeek,
            ResolvedTemplateWeekNumber = templateWeekNumber,
            PlanDay = targetDay,
            Exercises = exercises,
            EstimatedDurationMinutes = estMinutes,
            TemplateMode = mode,
        };
    }

    private static int IsoWeekday(DateTime asOfUtc, int utcOffsetMinutes)
    {
        var dow = asOfUtc.AddMinutes(utcOffsetMinutes).DayOfWeek;
        return dow == DayOfWeek.Sunday ? 7 : (int)dow;
    }

    private static int EstimateMinutes(IReadOnlyList<WorkoutPlanExercise> exercises)
    {
        var sec = exercises.Sum(e => Math.Max(1, e.Sets) * (45 + e.RestBetweenSets));
        return Math.Max(1, (int)Math.Round(sec / 60.0));
    }
}
