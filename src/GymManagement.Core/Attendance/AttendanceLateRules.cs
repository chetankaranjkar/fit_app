namespace GymManagement.Core.Attendance
{
    /// <summary>
    /// Late attendance is a property of one visit: the check-in on that attendance date
    /// versus the member's earliest active schedule start for that weekday.
    /// A late visit does not mark the member's other visits late.
    /// </summary>
    public static class AttendanceLateRules
    {
        public const int DefaultLateThresholdMinutes = 15;

        /// <summary>A Sunday. SQL weekday matching uses day difference from this date because EF cannot translate <c>DateTime.DayOfWeek</c> here.</summary>
        public static readonly DateTime WeekdayEpochSunday = new(2000, 1, 2);

        public static int WeekdayIndex(DateTime attendanceDate)
        {
            var days = (attendanceDate.Date - WeekdayEpochSunday).Days;
            var mod = days % 7;
            return mod < 0 ? mod + 7 : mod;
        }

        public static TimeSpan? EarliestStart(IEnumerable<TimeSpan> starts)
        {
            TimeSpan? earliest = null;
            foreach (var start in starts)
            {
                if (earliest is null || start < earliest.Value)
                    earliest = start;
            }

            return earliest;
        }

        /// <summary>
        /// Whole minutes after the scheduled start, truncated toward zero — same comparison the
        /// attendance list uses (<c>DATEDIFF(minute, scheduled, checkIn) &gt; threshold</c>).
        /// </summary>
        public static int LateByMinutes(DateTime checkInTime, DateTime attendanceDate, TimeSpan scheduledStart)
        {
            var scheduledAt = attendanceDate.Date.Add(scheduledStart);
            return (int)(checkInTime - scheduledAt).TotalMinutes;
        }

        public static bool IsLateVisit(
            DateTime checkInTime,
            DateTime attendanceDate,
            TimeSpan? earliestScheduledStart,
            int lateThresholdMinutes = DefaultLateThresholdMinutes)
        {
            if (earliestScheduledStart is null)
                return false;

            return LateByMinutes(checkInTime, attendanceDate, earliestScheduledStart.Value) > lateThresholdMinutes;
        }

        /// <summary>
        /// A late flag matches only the attendance row and calendar date it was calculated for.
        /// </summary>
        public static bool VisitMatchesLateRecord(
            int visitId,
            DateTime visitDate,
            int lateAttendanceLogId,
            DateTime lateAttendanceDate) =>
            visitId == lateAttendanceLogId && visitDate.Date == lateAttendanceDate.Date;
    }
}
