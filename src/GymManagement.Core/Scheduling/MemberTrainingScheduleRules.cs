namespace GymManagement.Core.Scheduling
{
    public static class MemberTrainingScheduleRules
    {
        public const string Batch = "Batch";
        public const string Custom = "Custom";

        public static readonly IReadOnlyDictionary<string, (TimeSpan Start, TimeSpan End)> BatchWindows =
            new Dictionary<string, (TimeSpan Start, TimeSpan End)>(StringComparer.OrdinalIgnoreCase)
            {
                ["Morning"] = (new TimeSpan(6, 0, 0), new TimeSpan(10, 0, 0)),
                ["Afternoon"] = (new TimeSpan(10, 0, 0), new TimeSpan(14, 0, 0)),
                ["Evening"] = (new TimeSpan(14, 0, 0), new TimeSpan(18, 0, 0)),
                ["Night"] = (new TimeSpan(18, 0, 0), new TimeSpan(22, 0, 0)),
            };

        public static bool TimesOverlap(TimeSpan aStart, TimeSpan aEnd, TimeSpan bStart, TimeSpan bEnd) =>
            aStart < bEnd && bStart < aEnd;

        public static HashSet<int> ParseDays(string? csv)
        {
            if (string.IsNullOrWhiteSpace(csv))
                return new HashSet<int>(Enumerable.Range(0, 7));

            var days = new HashSet<int>();
            foreach (var part in csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (int.TryParse(part, out var day) && day >= 0 && day <= 6)
                    days.Add(day);
            }

            return days.Count == 0 ? new HashSet<int>(Enumerable.Range(0, 7)) : days;
        }

        public static string FormatDays(HashSet<int> days)
        {
            if (days.Count == 0 || days.Count == 7)
                return "Daily";

            var labels = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
            return string.Join(", ", days.OrderBy(d => d).Select(d => labels[d]));
        }

        public static bool TryResolveSchedule(
            string? scheduleType,
            string? preferredGymTime,
            TimeSpan? trainingStartTime,
            TimeSpan? trainingEndTime,
            string? trainingDaysOfWeek,
            out TimeSpan start,
            out TimeSpan end,
            out HashSet<int> days)
        {
            start = default;
            end = default;
            days = ParseDays(trainingDaysOfWeek);

            var type = string.IsNullOrWhiteSpace(scheduleType) ? Batch : scheduleType.Trim();
            if (string.Equals(type, Custom, StringComparison.OrdinalIgnoreCase))
            {
                if (!trainingStartTime.HasValue || !trainingEndTime.HasValue || trainingEndTime <= trainingStartTime)
                    return false;

                start = trainingStartTime.Value;
                end = trainingEndTime.Value;
                return true;
            }

            if (string.IsNullOrWhiteSpace(preferredGymTime))
                return false;

            if (!BatchWindows.TryGetValue(preferredGymTime.Trim(), out var window))
                return false;

            start = window.Start;
            end = window.End;
            return true;
        }

        public static string FormatScheduleLabel(
            string? scheduleType,
            string? preferredGymTime,
            TimeSpan? trainingStartTime,
            TimeSpan? trainingEndTime,
            string? trainingDaysOfWeek)
        {
            if (!TryResolveSchedule(
                    scheduleType,
                    preferredGymTime,
                    trainingStartTime,
                    trainingEndTime,
                    trainingDaysOfWeek,
                    out var start,
                    out var end,
                    out var days))
            {
                return string.IsNullOrWhiteSpace(preferredGymTime) ? "Unassigned" : preferredGymTime;
            }

            var timeLabel = $"{FormatTime(start)} – {FormatTime(end)}";
            if (string.Equals(scheduleType, Custom, StringComparison.OrdinalIgnoreCase))
                return $"{timeLabel} ({FormatDays(days)})";

            var batch = preferredGymTime?.Trim();
            return string.IsNullOrWhiteSpace(batch) ? timeLabel : $"{batch} ({timeLabel})";
        }

        public static string FormatTime(TimeSpan value)
        {
            var hours = value.Hours;
            var minutes = value.Minutes;
            var suffix = hours >= 12 ? "PM" : "AM";
            var hour12 = hours % 12;
            if (hour12 == 0) hour12 = 12;
            return minutes == 0 ? $"{hour12} {suffix}" : $"{hour12}:{minutes:D2} {suffix}";
        }
    }
}
