namespace GymManagement.Infrastructure.Services;

internal static class GeoUtilities
{
    /// <returns>Great-circle distance in meters (WGS84 sphere approximation).</returns>
    public static double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double rad = Math.PI / 180.0;
        const double earthM = 6371000;
        var φ1 = lat1 * rad;
        var φ2 = lat2 * rad;
        var Δφ = (lat2 - lat1) * rad;
        var Δλ = (lon2 - lon1) * rad;

        var a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2)
            + Math.Cos(φ1) * Math.Cos(φ2) * Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthM * c;
    }

    /// <summary>Last UTC instant inside the calendar month containing <paramref name="utc"/>.</summary>
    public static DateTime EndOfUtcMonth(DateTime utc) =>
        new DateTime(utc.Year, utc.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1).AddTicks(-1);
}
