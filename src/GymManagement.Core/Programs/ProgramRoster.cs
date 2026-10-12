using GymManagement.Core.DTOs;

namespace GymManagement.Core.Programs;

/// <summary>
/// Current program membership is one row per user who has at least one active, non-deleted
/// schedule slot for that plan. Weekday slots do not create extra members. Replaced assignments
/// are inactive and are left out. Coach display and profile access follow active
/// <c>UserInstructors</c> rows (not the schedule slot trainer).
/// </summary>
public static class ProgramRoster
{
    public const string NoCoachAssigned = "No coach assigned";
    public const string AssignedToAnotherCoach = "Assigned to another coach";

    public static IReadOnlyList<ProgramRosterMemberDto> Build(
        IEnumerable<ProgramRosterSlot> slots,
        IEnumerable<ProgramRosterCoach> coaches,
        bool hasFullUsersAccess,
        int? callerTrainerProfileId)
    {
        var current = slots
            .Where(s => s.IsActive && !s.IsDeleted)
            .GroupBy(s => s.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                MemberName = DisplayName(g.Select(s => s.MemberName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)), g.Key),
                StartedAt = g.Min(s => s.CreatedAt),
            })
            .ToList();

        var activeCoaches = coaches
            .Where(c => c.IsActive && !c.IsDeleted && c.EndDate == null)
            .GroupBy(c => c.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return current
            .Select(member =>
            {
                activeCoaches.TryGetValue(member.UserId, out var memberCoaches);
                memberCoaches ??= new List<ProgramRosterCoach>();
                var (label, canOpen) = ResolveCoach(memberCoaches, hasFullUsersAccess, callerTrainerProfileId);
                return new ProgramRosterMemberDto
                {
                    UserId = member.UserId,
                    MemberName = member.MemberName,
                    CoachLabel = label,
                    AssignmentStartedAt = member.StartedAt,
                    AssignmentEndedAt = null,
                    CanOpenProfile = canOpen,
                };
            })
            .OrderBy(m => m.MemberName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(m => m.UserId)
            .ToList();
    }

    private static (string Label, bool CanOpen) ResolveCoach(
        IReadOnlyList<ProgramRosterCoach> activeCoaches,
        bool hasFullUsersAccess,
        int? callerTrainerProfileId)
    {
        if (hasFullUsersAccess)
        {
            var latest = Latest(activeCoaches);
            return (latest == null ? NoCoachAssigned : CoachName(latest), true);
        }

        var own = callerTrainerProfileId.HasValue
            ? activeCoaches.FirstOrDefault(c => c.TrainerId == callerTrainerProfileId.Value)
            : null;
        if (own != null)
            return (CoachName(own), true);

        if (activeCoaches.Count > 0)
            return (AssignedToAnotherCoach, false);

        return (NoCoachAssigned, false);
    }

    private static ProgramRosterCoach? Latest(IReadOnlyList<ProgramRosterCoach> coaches) =>
        coaches
            .OrderByDescending(c => c.AssignmentDate ?? DateTime.MinValue)
            .ThenByDescending(c => c.TrainerId)
            .FirstOrDefault();

    private static string CoachName(ProgramRosterCoach coach) =>
        string.IsNullOrWhiteSpace(coach.CoachName) ? "Assigned coach" : coach.CoachName.Trim();

    private static string DisplayName(string? name, int userId) =>
        string.IsNullOrWhiteSpace(name) ? $"Member #{userId}" : name.Trim();
}

public sealed class ProgramRosterSlot
{
    public int UserId { get; init; }
    public string? MemberName { get; init; }
    public DateTime CreatedAt { get; init; }
    public bool IsActive { get; init; }
    public bool IsDeleted { get; init; }
}

public sealed class ProgramRosterCoach
{
    public int UserId { get; init; }
    public int TrainerId { get; init; }
    public string? CoachName { get; init; }
    public DateTime? AssignmentDate { get; init; }
    public DateTime? EndDate { get; init; }
    public bool IsActive { get; init; }
    public bool IsDeleted { get; init; }
}
