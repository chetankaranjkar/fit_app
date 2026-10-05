namespace GymManagement.Core.Attendance
{
    public static class AttendanceVisitStatus
    {
        public const string All = "all";
        public const string CheckedIn = "checked-in";
        public const string CheckedOut = "checked-out";
        public const string Late = "late";

        public static string Normalize(string? status)
        {
            var value = (status ?? string.Empty).Trim().ToLowerInvariant().Replace("_", "-");
            return value switch
            {
                "checked-in" or "checkedin" or "active" => CheckedIn,
                "checked-out" or "checkedout" or "completed" => CheckedOut,
                "late" => Late,
                _ => All,
            };
        }
    }
}
