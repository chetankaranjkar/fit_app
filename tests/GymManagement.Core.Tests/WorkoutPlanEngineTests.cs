using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class WorkoutPlanEngineTests
{
    private readonly WorkoutPlanEngine _engine = new();

    private static WorkoutPlan Plan(
        string mode,
        int durationDays = 90,
        int templateWeekCount = 1) =>
        new()
        {
            Id = 1,
            DurationDays = durationDays,
            TemplateMode = mode,
            TemplateWeekCount = templateWeekCount,
            RepeatTemplate = true,
        };

    [Theory]
    [InlineData(30)]
    [InlineData(60)]
    [InlineData(90)]
    [InlineData(180)]
    [InlineData(365)]
    public void CalculateProgramDay_caps_at_duration(int durationDays)
    {
        var plan = Plan(WorkoutPlanTemplateModes.Simple, durationDays);
        var start = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOf = start.AddDays(durationDays + 10);

        var day = _engine.CalculateProgramDay(plan, start, asOf, 0);

        Assert.Equal(durationDays, day);
    }

    [Fact]
    public void CalculateProgramWeek_day1_is_week1()
    {
        Assert.Equal(1, _engine.CalculateProgramWeek(1));
        Assert.Equal(1, _engine.CalculateProgramWeek(7));
        Assert.Equal(2, _engine.CalculateProgramWeek(8));
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 1)]
    [InlineData(3, 1)]
    [InlineData(4, 1)]
    public void Simple_mode_always_resolves_template_week_1(int programWeek, int expected)
    {
        var plan = Plan(WorkoutPlanTemplateModes.Simple, templateWeekCount: 1);
        Assert.Equal(expected, _engine.ResolveTemplateWeekNumber(plan, programWeek));
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 2)]
    [InlineData(3, 3)]
    [InlineData(4, 4)]
    [InlineData(5, 1)]
    [InlineData(8, 4)]
    [InlineData(9, 1)]
    public void Advanced_mode_cycles_template_weeks(int programWeek, int expected)
    {
        var plan = Plan(WorkoutPlanTemplateModes.Advanced, templateWeekCount: 4);
        Assert.Equal(expected, _engine.ResolveTemplateWeekNumber(plan, programWeek));
    }

    [Fact]
    public void Legacy_mode_uses_program_week_as_template_week()
    {
        var plan = Plan(WorkoutPlanTemplateModes.Legacy);
        Assert.Equal(12, _engine.ResolveTemplateWeekNumber(plan, 12));
    }

    [Fact]
    public void ResolveToday_simple_mode_uses_week1_day_for_iso_weekday()
    {
        var plan = Plan(WorkoutPlanTemplateModes.Simple, 30, 1);
        var week = new WorkoutPlanWeek { Id = 10, WeekNumber = 1, WorkoutPlanId = 1 };
        var monday = new WorkoutPlanDay
        {
            Id = 100,
            WorkoutPlanWeekId = 10,
            DayNumber = 1,
            Name = "Chest",
            IsRestDay = false,
        };
        var exercise = new WorkoutPlanExercise
        {
            Id = 1,
            WorkoutPlanDayId = 100,
            ExerciseId = 5,
            Sets = 3,
            Reps = 10,
            Order = 1,
            RestBetweenSets = 60,
        };

        // 2026-06-08 is Monday UTC
        var asOf = new DateTime(2026, 6, 8, 12, 0, 0, DateTimeKind.Utc);
        var ctx = new WorkoutPlanScheduleContext
        {
            Plan = plan,
            Weeks = new[] { week },
            Days = new[] { monday },
            Exercises = new[] { exercise },
            ProgramStartDate = asOf.AddDays(-7),
            AsOfUtc = asOf,
            UtcOffsetMinutes = 0,
        };

        var resolved = _engine.ResolveToday(ctx);

        Assert.Equal(WorkoutPlanTemplateModes.Simple, resolved.TemplateMode);
        Assert.False(resolved.IsRestDay);
        Assert.Single(resolved.Exercises);
        Assert.Equal(100, resolved.PlanDay?.Id);
    }

    [Fact]
    public void ResolveToday_advanced_mode_week2_uses_second_template()
    {
        var plan = Plan(WorkoutPlanTemplateModes.Advanced, 60, 2);
        var weekA = new WorkoutPlanWeek { Id = 10, WeekNumber = 1 };
        var weekB = new WorkoutPlanWeek { Id = 20, WeekNumber = 2 };
        var dayA = new WorkoutPlanDay { Id = 101, WorkoutPlanWeekId = 10, DayNumber = 4, Name = "Beginner" };
        var dayB = new WorkoutPlanDay { Id = 201, WorkoutPlanWeekId = 20, DayNumber = 4, Name = "Hypertrophy" };
        var exA = new WorkoutPlanExercise { Id = 1, WorkoutPlanDayId = 101, ExerciseId = 1, Sets = 2, Reps = 8, Order = 1 };
        var exB = new WorkoutPlanExercise { Id = 2, WorkoutPlanDayId = 201, ExerciseId = 2, Sets = 4, Reps = 12, Order = 1 };

        // Program day 8 => week 2 => template week 2
        var start = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOf = start.AddDays(7); // day 8, Monday

        var ctx = new WorkoutPlanScheduleContext
        {
            Plan = plan,
            Weeks = new[] { weekA, weekB },
            Days = new[] { dayA, dayB },
            Exercises = new[] { exA, exB },
            ProgramStartDate = start,
            AsOfUtc = asOf,
            UtcOffsetMinutes = 0,
        };

        var resolved = _engine.ResolveToday(ctx);

        Assert.Equal(2, resolved.ResolvedTemplateWeekNumber);
        Assert.Equal(201, resolved.PlanDay?.Id);
        Assert.Single(resolved.Exercises);
        Assert.Equal(2, resolved.Exercises[0].ExerciseId);
    }

    [Fact]
    public void ResolveToday_rest_day_has_no_exercises()
    {
        var plan = Plan(WorkoutPlanTemplateModes.Simple);
        var week = new WorkoutPlanWeek { Id = 1, WeekNumber = 1 };
        var rest = new WorkoutPlanDay { Id = 50, WorkoutPlanWeekId = 1, DayNumber = 3, IsRestDay = true, Name = "Rest" };
        var asOf = new DateTime(2026, 6, 10, 12, 0, 0, DateTimeKind.Utc); // Wednesday

        var resolved = _engine.ResolveToday(new WorkoutPlanScheduleContext
        {
            Plan = plan,
            Weeks = new[] { week },
            Days = new[] { rest },
            Exercises = Array.Empty<WorkoutPlanExercise>(),
            ProgramStartDate = asOf,
            AsOfUtc = asOf,
            UtcOffsetMinutes = 0,
        });

        Assert.True(resolved.IsRestDay);
        Assert.Empty(resolved.Exercises);
    }

    [Fact]
    public void ResolveToday_legacy_uses_iso_weekday_without_template_cycling()
    {
        var plan = Plan(WorkoutPlanTemplateModes.Legacy, 90, 1);
        var friday = new WorkoutPlanDay { Id = 5, DayNumber = 5, Name = "Legs", IsRestDay = false };
        var ex = new WorkoutPlanExercise { Id = 9, WorkoutPlanDayId = 5, ExerciseId = 3, Sets = 3, Reps = 8, Order = 1 };
        var asOf = new DateTime(2026, 6, 12, 10, 0, 0, DateTimeKind.Utc); // Friday

        var resolved = _engine.ResolveToday(new WorkoutPlanScheduleContext
        {
            Plan = plan,
            Weeks = Array.Empty<WorkoutPlanWeek>(),
            Days = new[] { friday },
            Exercises = new[] { ex },
            ProgramStartDate = asOf.AddDays(-20),
            AsOfUtc = asOf,
            UtcOffsetMinutes = 0,
        });

        Assert.Equal(WorkoutPlanTemplateModes.Legacy, resolved.TemplateMode);
        Assert.Equal(5, resolved.PlanDay?.Id);
    }
}
