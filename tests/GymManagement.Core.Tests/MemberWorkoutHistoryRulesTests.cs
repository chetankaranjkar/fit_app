using GymManagement.Core.Workouts;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class MemberWorkoutHistoryRulesTests
{
    [Theory]
    [InlineData(true, false, false, true)]
    [InlineData(false, true, false, true)]
    [InlineData(false, false, true, true)]
    [InlineData(false, false, false, false)]
    public void Access_follows_full_access_or_an_active_coach_assignment(
        bool isSelf, bool hasFullUsersAccess, bool hasActiveCoachAssignment, bool expected)
    {
        Assert.Equal(expected, MemberWorkoutHistoryRules.CanView(isSelf, hasFullUsersAccess, hasActiveCoachAssignment));
    }

    [Fact]
    public void Full_access_is_not_blocked_by_also_having_a_trainer_profile()
    {
        Assert.True(MemberWorkoutHistoryRules.CanView(isSelf: false, hasFullUsersAccess: true, hasActiveCoachAssignment: false));
    }

    [Fact]
    public void Ended_or_other_coach_assignment_does_not_grant_access()
    {
        Assert.False(MemberWorkoutHistoryRules.CanView(isSelf: false, hasFullUsersAccess: false, hasActiveCoachAssignment: false));
    }

    [Fact]
    public void Legacy_completed_rows_match_the_completed_filter()
    {
        Assert.True(MemberWorkoutHistoryRules.MatchesStatus(null, isCompleted: true, "Completed"));
        Assert.False(MemberWorkoutHistoryRules.MatchesStatus(null, isCompleted: true, "InProgress"));
        Assert.Equal("Skipped", MemberWorkoutHistoryRules.NormalizeStatus("Skipped", isCompleted: false));
    }

    [Fact]
    public void Date_range_uses_the_viewer_offset_and_keeps_the_end_date_inclusive()
    {
        var occurred = new DateTime(2026, 10, 12, 18, 30, 0, DateTimeKind.Utc);
        var day = new DateTime(2026, 10, 13);

        Assert.True(MemberWorkoutHistoryRules.InLocalDateRange(occurred, day, day, 330));
        Assert.False(MemberWorkoutHistoryRules.InLocalDateRange(occurred, new DateTime(2026, 10, 12), new DateTime(2026, 10, 12), 330));
    }

    [Fact]
    public void Missing_duration_stays_unavailable()
    {
        Assert.Null(MemberWorkoutHistoryRules.DurationMinutes(null, null, null));
        Assert.Null(MemberWorkoutHistoryRules.DurationMinutes(0, null, null));
        Assert.Equal(45, MemberWorkoutHistoryRules.DurationMinutes(45, null, null));
    }

    [Fact]
    public void History_volume_ignores_mirrored_logs_and_does_not_treat_missing_weight_as_zero()
    {
        var tracked = new[]
        {
            new PerformedSet(20m, 10),
            new PerformedSet(null, 8),
        };
        var mirrored = new[] { new PerformedSet(20m, 10), new PerformedSet(null, 8) };

        var work = RecordedWork.FromSources(hasTrackedRows: true, trackedTotal: 2, tracked, mirrored);

        Assert.Equal(2, work.CompletedSets);
        Assert.Equal(200m, work.Volume);
        Assert.False(work.VolumeComplete);
    }
}
