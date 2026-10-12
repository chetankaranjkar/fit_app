namespace GymManagement.Core.Workouts;

/// <summary>
/// Local workout calendar dates. Stored <c>WorkoutDate</c> values are calendar dates
/// (unspecified kind), computed from UTC plus the client offset — including across midnight.
/// </summary>
public static class WorkoutCalendar
{
    public static DateTime LocalDate(DateTime utcNow, int utcOffsetMinutes)
    {
        var shifted = utcNow.AddMinutes(utcOffsetMinutes);
        return new DateTime(shifted.Year, shifted.Month, shifted.Day);
    }

    public static bool SameCalendarDay(DateTime stored, DateTime localDate) =>
        stored.Year == localDate.Year && stored.Month == localDate.Month && stored.Day == localDate.Day;
}
