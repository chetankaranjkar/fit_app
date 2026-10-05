using GymManagement.Core.Attendance;
using GymManagement.Core.DTOs;
using Xunit;

namespace GymManagement.Core.Tests;

public class AttendanceLateRulesTests
{
    private static readonly DateTime Monday = new(2026, 10, 5);
    private static readonly DateTime Tuesday = new(2026, 10, 6);
    private static readonly TimeSpan Seven = new(7, 0, 0);
    private static readonly TimeSpan Nine = new(9, 0, 0);

    [Fact]
    public void Weekday_index_matches_the_attendance_date_for_dates_around_the_epoch()
    {
        Assert.Equal(DayOfWeek.Sunday, AttendanceLateRules.WeekdayEpochSunday.DayOfWeek);
        foreach (var day in new[] { -400, -1, 0, 1, 6, 7, 4000 })
        {
            var date = AttendanceLateRules.WeekdayEpochSunday.AddDays(day);
            Assert.Equal((int)date.DayOfWeek, AttendanceLateRules.WeekdayIndex(date));
        }
    }

    [Fact]
    public void Visit_is_late_only_against_that_dates_earliest_start()
    {
        var earliest = AttendanceLateRules.EarliestStart(new[] { Nine, Seven });
        Assert.Equal(Seven, earliest);

        var checkIn = Monday.AddHours(7).AddMinutes(20);
        Assert.True(AttendanceLateRules.IsLateVisit(checkIn, Monday, earliest));
        Assert.Equal(20, AttendanceLateRules.LateByMinutes(checkIn, Monday, earliest!.Value));

        Assert.False(AttendanceLateRules.IsLateVisit(Monday.AddHours(7).AddMinutes(15), Monday, earliest));
        Assert.False(AttendanceLateRules.IsLateVisit(checkIn, Tuesday, earliestScheduledStart: null));
    }

    [Fact]
    public void Another_visit_by_the_same_member_does_not_inherit_a_late_flag()
    {
        const int lateLogId = 41;
        var tuesdayVisitId = 42;

        Assert.True(AttendanceLateRules.VisitMatchesLateRecord(lateLogId, Monday, lateLogId, Monday));
        Assert.False(AttendanceLateRules.VisitMatchesLateRecord(tuesdayVisitId, Tuesday, lateLogId, Monday));
        Assert.False(AttendanceLateRules.VisitMatchesLateRecord(lateLogId, Tuesday, lateLogId, Monday));
    }

    [Fact]
    public void On_time_visit_on_the_late_day_is_not_the_late_record()
    {
        const int lateLogId = 41;
        const int onTimeLogId = 99;

        Assert.False(AttendanceLateRules.IsLateVisit(Monday.AddHours(7).AddMinutes(10), Monday, Seven));
        Assert.False(AttendanceLateRules.VisitMatchesLateRecord(onTimeLogId, Monday, lateLogId, Monday));
    }

    [Fact]
    public void Summary_counts_cover_the_range_and_completion_is_completed_over_total()
    {
        var summary = AttendanceRangeSummaryDto.FromCounts(totalVisits: 10, activeVisits: 3, uniqueMembers: 8);

        Assert.Equal(10, summary.TotalVisits);
        Assert.Equal(3, summary.ActiveVisits);
        Assert.Equal(7, summary.CompletedSessions);
        Assert.Equal(8, summary.UniqueMembers);
        Assert.Equal(70, AttendanceRangeSummaryDto.SessionCompletionPercent(summary.CompletedSessions, summary.TotalVisits));
        Assert.Equal(0, AttendanceRangeSummaryDto.SessionCompletionPercent(0, 0));
    }

    [Fact]
    public void Attendance_date_uses_the_asia_kolkata_calendar_not_the_utc_date()
    {
        var justAfterMidnightIst = new DateTime(2026, 10, 4, 18, 30, 0, DateTimeKind.Utc);
        var justBeforeMidnightIst = new DateTime(2026, 10, 4, 18, 29, 0, DateTimeKind.Utc);
        var nextMidnightIst = new DateTime(2026, 10, 5, 18, 30, 0, DateTimeKind.Utc);

        Assert.Equal(new DateTime(2026, 10, 5), GymCalendar.AttendanceDateFromUtc(justAfterMidnightIst));
        Assert.Equal(new DateTime(2026, 10, 4), GymCalendar.AttendanceDateFromUtc(justBeforeMidnightIst));
        Assert.Equal(new DateTime(2026, 10, 6), GymCalendar.AttendanceDateFromUtc(nextMidnightIst));
    }

    [Theory]
    [InlineData("checked-in", "checked-in")]
    [InlineData("completed", "checked-out")]
    [InlineData("late", "late")]
    [InlineData("whatever", "all")]
    public void Status_filter_names_normalize_before_the_query(string raw, string expected)
    {
        Assert.Equal(expected, AttendanceVisitStatus.Normalize(raw));
    }
}
