using GymManagement.Core.Scheduling;
using Xunit;

namespace GymManagement.Core.Tests;

public class TrainerDayRulesTests
{
    private static readonly TrainingScheduleInput MorningBatch = new("Batch", "Morning", null, null, null);

    // Mon/Wed/Fri 07:00–08:00
    private static readonly TrainingScheduleInput CustomMwf =
        new("Custom", null, new TimeSpan(7, 0, 0), new TimeSpan(8, 0, 0), "1,3,5");

    private static readonly TrainingScheduleInput Unscheduled = new("Batch", null, null, null, null);

    // 2026-10-05 is a Monday.
    private static readonly DateOnly Monday = new(2026, 10, 5);
    private static readonly DateOnly Tuesday = new(2026, 10, 6);

    private static DateTime At(DateOnly day, int hour, int minute = 0) =>
        day.ToDateTime(new TimeOnly(hour, minute));

    [Fact]
    public void Batch_schedule_is_expected_every_day_with_batch_window()
    {
        Assert.True(TrainerDayRules.TryGetWindowOn(MorningBatch, DayOfWeek.Sunday, out var start, out var end));
        Assert.Equal(new TimeSpan(6, 0, 0), start);
        Assert.Equal(new TimeSpan(10, 0, 0), end);
    }

    [Fact]
    public void Custom_schedule_is_expected_only_on_selected_days()
    {
        Assert.True(TrainerDayRules.TryGetWindowOn(CustomMwf, DayOfWeek.Monday, out _, out _));
        Assert.False(TrainerDayRules.TryGetWindowOn(CustomMwf, DayOfWeek.Tuesday, out _, out _));
    }

    [Fact]
    public void Missing_schedule_is_never_expected()
    {
        Assert.False(TrainerDayRules.TryGetWindowOn(Unscheduled, DayOfWeek.Monday, out _, out _));
        Assert.Equal(
            ExpectedVisitState.NotScheduled,
            TrainerDayRules.Classify(Unscheduled, Monday, At(Monday, 23), hasCheckIn: false));
    }

    [Fact]
    public void Recorded_check_in_wins_over_schedule_inference()
    {
        Assert.Equal(
            ExpectedVisitState.CheckedIn,
            TrainerDayRules.Classify(CustomMwf, Monday, At(Monday, 23), hasCheckIn: true));
    }

    [Theory]
    [InlineData(6, 30, ExpectedVisitState.AwaitingCheckIn)]
    [InlineData(7, 59, ExpectedVisitState.AwaitingCheckIn)]
    [InlineData(8, 0, ExpectedVisitState.MissedInferred)]
    [InlineData(21, 0, ExpectedVisitState.MissedInferred)]
    public void Today_without_check_in_is_inferred_from_window_end(int hour, int minute, ExpectedVisitState expected)
    {
        Assert.Equal(
            expected,
            TrainerDayRules.Classify(CustomMwf, Monday, At(Monday, hour, minute), hasCheckIn: false));
    }

    [Fact]
    public void Off_day_is_not_scheduled_even_without_check_in()
    {
        Assert.Equal(
            ExpectedVisitState.NotScheduled,
            TrainerDayRules.Classify(CustomMwf, Tuesday, At(Tuesday, 21), hasCheckIn: false));
    }

    [Fact]
    public void Past_scheduled_day_without_check_in_is_missed()
    {
        Assert.Equal(
            ExpectedVisitState.MissedInferred,
            TrainerDayRules.Classify(CustomMwf, Monday, At(Tuesday, 6), hasCheckIn: false));
    }

    [Fact]
    public void InferMissedDays_skips_today_off_days_and_checked_in_days()
    {
        // Today = Mon 2026-10-12; lookback 7 covers Mon 5 … Sun 11. Scheduled: Mon 5, Wed 7, Fri 9.
        var today = new DateOnly(2026, 10, 12);
        var checkIns = new HashSet<DateOnly> { new(2026, 10, 7) };

        var missed = TrainerDayRules.InferMissedDays(CustomMwf, today, 7, checkIns, assignedOn: null);

        Assert.Equal(new[] { new DateOnly(2026, 10, 9), new DateOnly(2026, 10, 5) }, missed);
    }

    [Fact]
    public void InferMissedDays_ignores_days_before_assignment()
    {
        var today = new DateOnly(2026, 10, 12);
        var missed = TrainerDayRules.InferMissedDays(
            CustomMwf, today, 7, new HashSet<DateOnly>(), assignedOn: new DateOnly(2026, 10, 8));

        Assert.Equal(new[] { new DateOnly(2026, 10, 9) }, missed);
    }

    [Fact]
    public void InferMissedDays_clamps_lookback_and_handles_unscheduled()
    {
        var today = new DateOnly(2026, 10, 12);
        Assert.Empty(TrainerDayRules.InferMissedDays(MorningBatch, today, 0, new HashSet<DateOnly>(), null));
        Assert.Empty(TrainerDayRules.InferMissedDays(Unscheduled, today, 7, new HashSet<DateOnly>(), null));
        Assert.Equal(
            TrainerDayRules.MaxMissedLookbackDays,
            TrainerDayRules.InferMissedDays(MorningBatch, today, 365, new HashSet<DateOnly>(), null).Count);
    }

    [Theory]
    [InlineData(null, TrainerDayRules.DefaultMaxActiveClients)]
    [InlineData(12, 12)]
    public void EffectiveCapacity_falls_back_to_default(int? configured, int expected)
    {
        Assert.Equal(expected, TrainerDayRules.EffectiveCapacity(configured));
    }
}
