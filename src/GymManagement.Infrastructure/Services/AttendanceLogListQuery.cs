using Microsoft.EntityFrameworkCore;
using GymManagement.Core.Attendance;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>
    /// Shared filters for the attendance log. Status is applied on the query, before count and paging.
    /// Late visits use <see cref="AttendanceLateRules"/>: earliest active start on that attendance date,
    /// and <c>DATEDIFF(minute, scheduled, checkIn) &gt; threshold</c>.
    /// </summary>
    public static class AttendanceLogListQuery
    {
        public static IQueryable<AttendanceLog> Apply(
            IQueryable<AttendanceLog> logs,
            IQueryable<User> users,
            IQueryable<UserSchedule> schedules,
            DateTime? fromDate,
            DateTime? toDate,
            string? search,
            string? status,
            int lateThresholdMinutes)
        {
            var query = logs;

            if (fromDate.HasValue)
            {
                var from = fromDate.Value.Date;
                query = query.Where(a => a.AttendanceDate >= from);
            }

            if (toDate.HasValue)
            {
                var to = toDate.Value.Date;
                query = query.Where(a => a.AttendanceDate <= to);
            }

            var trimmedSearch = search?.Trim();
            if (!string.IsNullOrWhiteSpace(trimmedSearch))
            {
                var likeSearch = $"%{trimmedSearch}%";
                query = query.Where(a =>
                    a.UserId.HasValue
                    && users.Any(u =>
                        u.Id == a.UserId
                        && (EF.Functions.Like(u.FirstName, likeSearch)
                            || EF.Functions.Like(u.LastName, likeSearch)
                            || EF.Functions.Like(u.Phone ?? string.Empty, likeSearch))));
            }

            var normalized = AttendanceVisitStatus.Normalize(status);
            var threshold = Math.Clamp(lateThresholdMinutes, 0, 24 * 60);
            if (normalized == AttendanceVisitStatus.CheckedIn)
                query = query.Where(a => a.CheckOutTime == null);
            else if (normalized == AttendanceVisitStatus.CheckedOut)
                query = query.Where(a => a.CheckOutTime != null);
            else if (normalized == AttendanceVisitStatus.Late)
                query = ApplyLate(query, schedules, threshold);

            return query;
        }

        private static IQueryable<AttendanceLog> ApplyLate(
            IQueryable<AttendanceLog> logs,
            IQueryable<UserSchedule> schedules,
            int threshold)
        {
            // Late for any active start that weekday is the same as late for the earliest start:
            // a later start only increases the lateness. Weekday is matched with day-diff from a
            // Sunday because DateTime.DayOfWeek does not translate on this model.
            var epoch = AttendanceLateRules.WeekdayEpochSunday;
            return logs.Where(a =>
                a.UserId != null
                && schedules.Any(s =>
                    s.IsActive
                    && s.UserId == a.UserId
                    && ((EF.Functions.DateDiffDay(epoch, a.AttendanceDate) % 7) + 7) % 7 == (int)s.DayOfWeek
                    && EF.Functions.DateDiffMinute(a.AttendanceDate, a.CheckInTime)
                        > EF.Functions.DateDiffMinute(TimeSpan.Zero, s.StartTime) + threshold));
        }
    }
}
