using GymManagement.Domain.Entities;

namespace GymManagement.Core.Workouts;

/// <summary>
/// Profile workout history is server-synced <c>WorkoutSessions</c> for one <c>Users.Id</c>.
/// Access is full Users access, the member themselves, or an active coach assignment.
/// A trainer role, a shared program, or an ended assignment does not grant access by itself.
/// </summary>
public static class MemberWorkoutHistoryRules
{
    public static bool CanView(bool isSelf, bool hasFullUsersAccess, bool hasActiveCoachAssignment)
    {
        if (isSelf || hasFullUsersAccess)
            return true;
        return hasActiveCoachAssignment;
    }

    public static string NormalizeStatus(string? status, bool isCompleted)
    {
        if (string.Equals(status, WorkoutSessionStatus.Completed, StringComparison.OrdinalIgnoreCase))
            return WorkoutSessionStatus.Completed;
        if (string.Equals(status, WorkoutSessionStatus.Skipped, StringComparison.OrdinalIgnoreCase))
            return WorkoutSessionStatus.Skipped;
        if (string.Equals(status, WorkoutSessionStatus.InProgress, StringComparison.OrdinalIgnoreCase))
            return WorkoutSessionStatus.InProgress;
        return isCompleted ? WorkoutSessionStatus.Completed : WorkoutSessionStatus.InProgress;
    }

    public static bool MatchesStatus(string? status, bool isCompleted, string? statusFilter)
    {
        if (string.IsNullOrWhiteSpace(statusFilter) || statusFilter.Equals("all", StringComparison.OrdinalIgnoreCase))
            return true;
        return string.Equals(NormalizeStatus(status, isCompleted), statusFilter.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    public static DateTime OccurredUtc(DateTime? sessionStartUtc, DateTime sessionDate) =>
        sessionStartUtc ?? sessionDate;

    public static int ClampOffset(int utcOffsetMinutes) => Math.Clamp(utcOffsetMinutes, -14 * 60, 14 * 60);

    /// <summary>Inclusive local calendar dates, converted with the viewer's UTC offset.</summary>
    public static bool InLocalDateRange(
        DateTime occurredUtc,
        DateTime? fromLocalDate,
        DateTime? toLocalDate,
        int utcOffsetMinutes)
    {
        var offset = ClampOffset(utcOffsetMinutes);
        if (fromLocalDate.HasValue)
        {
            var startUtc = fromLocalDate.Value.Date.AddMinutes(-offset);
            if (occurredUtc < startUtc)
                return false;
        }

        if (toLocalDate.HasValue)
        {
            var endUtc = toLocalDate.Value.Date.AddDays(1).AddMinutes(-offset);
            if (occurredUtc >= endUtc)
                return false;
        }

        return true;
    }

    public static int? DurationMinutes(int? storedMinutes, DateTime? startUtc, DateTime? endUtc)
    {
        if (storedMinutes.HasValue && storedMinutes.Value > 0)
            return storedMinutes;
        if (startUtc.HasValue && endUtc.HasValue && endUtc.Value > startUtc.Value)
            return Math.Max(1, (int)(endUtc.Value - startUtc.Value).TotalMinutes);
        return null;
    }
}
