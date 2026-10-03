namespace GymManagement.Core.Scheduling
{
    /// <summary>Attendance state of an assigned client on a given local day.</summary>
    public enum ExpectedVisitState
    {
        NotScheduled,
        /// <summary>An <c>AttendanceLogs</c> row exists for the day (recorded).</summary>
        CheckedIn,
        /// <summary>Scheduled window has not ended yet and no check-in exists (inferred).</summary>
        AwaitingCheckIn,
        /// <summary>Scheduled window has ended with no check-in (inferred, never persisted).</summary>
        MissedInferred,
    }

    public sealed record TrainingScheduleInput(
        string? ScheduleType,
        string? PreferredGymTime,
        TimeSpan? TrainingStartTime,
        TimeSpan? TrainingEndTime,
        string? TrainingDaysOfWeek);

    public static class TrainerDayRules
    {
        /// <summary>Applied by coach assignment when <c>Trainer.MaxActiveClients</c> is null.</summary>
        public const int DefaultMaxActiveClients = 30;

        public const int MaxMissedLookbackDays = 31;

        public static bool TryGetWindowOn(
            TrainingScheduleInput schedule,
            DayOfWeek day,
            out TimeSpan start,
            out TimeSpan end)
        {
            if (!MemberTrainingScheduleRules.TryResolveSchedule(
                    schedule.ScheduleType,
                    schedule.PreferredGymTime,
                    schedule.TrainingStartTime,
                    schedule.TrainingEndTime,
                    schedule.TrainingDaysOfWeek,
                    out start,
                    out end,
                    out var days))
            {
                return false;
            }

            return days.Contains((int)day);
        }

        public static ExpectedVisitState Classify(
            TrainingScheduleInput schedule,
            DateOnly localDate,
            DateTime localNow,
            bool hasCheckIn)
        {
            if (!TryGetWindowOn(schedule, localDate.DayOfWeek, out _, out var end))
                return ExpectedVisitState.NotScheduled;

            if (hasCheckIn)
                return ExpectedVisitState.CheckedIn;

            var today = DateOnly.FromDateTime(localNow);
            if (localDate > today)
                return ExpectedVisitState.AwaitingCheckIn;
            if (localDate < today)
                return ExpectedVisitState.MissedInferred;

            return localNow.TimeOfDay >= end
                ? ExpectedVisitState.MissedInferred
                : ExpectedVisitState.AwaitingCheckIn;
        }

        /// <summary>
        /// Past days (newest first) in the lookback where the schedule expected a visit and no check-in exists.
        /// Today is excluded; days before the coach assignment started are ignored.
        /// </summary>
        public static IReadOnlyList<DateOnly> InferMissedDays(
            TrainingScheduleInput schedule,
            DateOnly today,
            int lookbackDays,
            IReadOnlySet<DateOnly> checkInDays,
            DateOnly? assignedOn)
        {
            var days = Math.Clamp(lookbackDays, 0, MaxMissedLookbackDays);
            var missed = new List<DateOnly>();
            for (var offset = 1; offset <= days; offset++)
            {
                var date = today.AddDays(-offset);
                if (assignedOn.HasValue && date < assignedOn.Value)
                    break;
                if (checkInDays.Contains(date))
                    continue;
                if (TryGetWindowOn(schedule, date.DayOfWeek, out _, out _))
                    missed.Add(date);
            }

            return missed;
        }

        public static int EffectiveCapacity(int? maxActiveClients) =>
            maxActiveClients ?? DefaultMaxActiveClients;
    }
}
