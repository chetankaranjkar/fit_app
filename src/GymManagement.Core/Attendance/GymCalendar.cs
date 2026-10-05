namespace GymManagement.Core.Attendance
{
    /// <summary>
    /// The gym calendar is Asia/Kolkata (also called Asia/Calcutta): a fixed UTC+05:30 offset.
    /// Attendance dates use that calendar day. UTC midnight through 05:30 is still the previous UTC date.
    /// </summary>
    public static class GymCalendar
    {
        public const int KolkataOffsetMinutes = 5 * 60 + 30;

        public static DateTime AttendanceDateFromUtc(DateTime instant)
        {
            var utc = instant.Kind switch
            {
                DateTimeKind.Local => instant.ToUniversalTime(),
                DateTimeKind.Utc => instant,
                _ => DateTime.SpecifyKind(instant, DateTimeKind.Utc),
            };
            return utc.AddMinutes(KolkataOffsetMinutes).Date;
        }
    }
}
