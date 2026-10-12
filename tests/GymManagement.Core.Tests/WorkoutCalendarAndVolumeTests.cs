using GymManagement.Core.Workouts;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class WorkoutCalendarAndVolumeTests
{
    [Fact]
    public void LocalDate_uses_client_offset_across_midnight()
    {
        var beforeMidnightIst = new DateTime(2026, 10, 12, 18, 29, 0, DateTimeKind.Utc);
        var afterMidnightIst = new DateTime(2026, 10, 12, 18, 30, 0, DateTimeKind.Utc);
        const int ist = 330;

        Assert.Equal(new DateTime(2026, 10, 12), WorkoutCalendar.LocalDate(beforeMidnightIst, ist));
        Assert.Equal(new DateTime(2026, 10, 13), WorkoutCalendar.LocalDate(afterMidnightIst, ist));
    }

    [Fact]
    public void SameCalendarDay_compares_date_parts_not_kind()
    {
        var storedUtcMidnight = new DateTime(2026, 10, 13, 0, 0, 0, DateTimeKind.Utc);
        var local = new DateTime(2026, 10, 13);

        Assert.True(WorkoutCalendar.SameCalendarDay(storedUtcMidnight, local));
        Assert.False(WorkoutCalendar.SameCalendarDay(storedUtcMidnight, new DateTime(2026, 10, 12)));
    }

    [Fact]
    public void Volume_uses_actual_weight_times_reps_and_skips_missing_values()
    {
        var work = RecordedWork.Score(3, new[]
        {
            new PerformedSet(20m, 10),
            new PerformedSet(null, 8),
            new PerformedSet(15m, null),
        });

        Assert.Equal(3, work.CompletedSets);
        Assert.Equal(200m, work.Volume);
        Assert.False(work.VolumeComplete);
    }

    [Fact]
    public void Tracked_rows_are_not_added_to_mirrored_logs()
    {
        var tracked = new[] { new PerformedSet(10m, 5) };
        var logs = new[] { new PerformedSet(10m, 5) };

        var work = RecordedWork.FromSources(hasTrackedRows: true, trackedTotal: 3, tracked, logs);

        Assert.Equal(1, work.CompletedSets);
        Assert.Equal(3, work.TotalSets);
        Assert.Equal(50m, work.Volume);
    }

    [Fact]
    public void Legacy_sessions_without_tracked_rows_use_logs()
    {
        var logs = new[] { new PerformedSet(40m, 8), new PerformedSet(40m, 8) };

        var work = RecordedWork.FromSources(false, 0, Array.Empty<PerformedSet>(), logs);

        Assert.Equal(2, work.CompletedSets);
        Assert.Equal(640m, work.Volume);
        Assert.True(work.VolumeComplete);
    }
}
