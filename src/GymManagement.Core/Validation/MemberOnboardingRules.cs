using GymManagement.Domain.Entities;

namespace GymManagement.Core.Validation;

/// <summary>Minimal membership row used to derive the member onboarding state.</summary>
public sealed record MembershipSnapshot(
    int Id,
    MembershipStatus Status,
    DateTime StartDate,
    DateTime EndDate,
    string? PlanName = null);

/// <summary>
/// Picks the membership the onboarding checklist reports on. Eligibility for workout/diet
/// stays with <see cref="UserMembershipRules.AllowsWorkoutAndDietAssignment"/>.
/// </summary>
public static class MemberOnboardingRules
{
    /// <summary>
    /// The in-flight membership: occupies the membership slot and has not ended.
    /// A paid, assignment-eligible row wins; otherwise the most recently started one.
    /// </summary>
    public static MembershipSnapshot? ResolveCurrentMembership(
        IEnumerable<MembershipSnapshot> memberships,
        DateTime? asOfUtc = null)
    {
        var today = (asOfUtc ?? DateTime.UtcNow).Date;
        var inFlight = memberships
            .Where(m => UserMembershipRules.OccupiesMembershipSlot(m.Status) && m.EndDate.Date >= today)
            .OrderByDescending(m => UserMembershipRules.AllowsWorkoutAndDietAssignment(m.Status, m.EndDate, today))
            .ThenByDescending(m => m.StartDate)
            .ThenByDescending(m => m.Id)
            .ToList();
        return inFlight.FirstOrDefault();
    }

    /// <summary>
    /// Most recent membership that ran out (expired, or ended without a status update) when there is
    /// no current one. Voided, cancelled, and transferred rows are ignored.
    /// </summary>
    public static MembershipSnapshot? ResolveLapsedMembership(
        IEnumerable<MembershipSnapshot> memberships,
        DateTime? asOfUtc = null)
    {
        var list = memberships.ToList();
        if (ResolveCurrentMembership(list, asOfUtc) != null)
            return null;
        return list
            .Where(m => !UserMembershipRules.IsTerminalForReporting(m.Status))
            .OrderByDescending(m => m.EndDate)
            .ThenByDescending(m => m.Id)
            .FirstOrDefault();
    }

    /// <summary>
    /// Membership to summarise in lists: current, else lapsed, else the latest terminal row so
    /// cancelled or voided members still show why they have no access.
    /// </summary>
    public static MembershipSnapshot? ResolveDisplayMembership(
        IEnumerable<MembershipSnapshot> memberships,
        DateTime? asOfUtc = null)
    {
        var list = memberships.ToList();
        return ResolveCurrentMembership(list, asOfUtc)
            ?? ResolveLapsedMembership(list, asOfUtc)
            ?? list.OrderByDescending(m => m.EndDate).ThenByDescending(m => m.Id).FirstOrDefault();
    }
}
