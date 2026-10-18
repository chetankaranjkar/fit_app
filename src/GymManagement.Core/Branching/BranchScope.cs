namespace GymManagement.Core.Branching;

/// <summary>
/// What one request is allowed to see and assign.
/// Organization-wide administrators are unrestricted. A request with no actor, such as a background job, is also unrestricted.
/// A restricted actor only sees rows tied to an authorized branch. Unassigned rows stay on the administrator report.
/// </summary>
public sealed class BranchScope
{
    private BranchScope(bool unrestricted, int? actorUserId, IReadOnlyList<int> branchIds)
    {
        IsUnrestricted = unrestricted;
        ActorUserId = actorUserId;
        BranchIds = branchIds;
    }

    public bool IsUnrestricted { get; }

    public int? ActorUserId { get; }

    public IReadOnlyList<int> BranchIds { get; }

    public static BranchScope Unrestricted(int? actorUserId = null) =>
        new(true, actorUserId, Array.Empty<int>());

    public static BranchScope Restricted(int? actorUserId, IReadOnlyCollection<int> branchIds) =>
        new(false, actorUserId, branchIds.Distinct().ToArray());

    public bool Includes(int? branchId) =>
        IsUnrestricted || (branchId is int id && BranchIds.Contains(id));

    public bool IncludesUser(int userId, int? homeBranchId, IEnumerable<int> additionalBranchIds) =>
        IsUnrestricted
        || userId == ActorUserId
        || Includes(homeBranchId)
        || additionalBranchIds.Any(id => BranchIds.Contains(id));

    /// <summary>
    /// Picks the branch for a new operational row.
    /// One available branch is used. Several branches use a valid authorized default, otherwise an explicit choice.
    /// </summary>
    public int ResolveForNewRecord(int? requestedBranchId, IReadOnlyList<int> activeBranchIds, int? defaultBranchId = null)
    {
        if (requestedBranchId is int requested)
        {
            if (!activeBranchIds.Contains(requested))
                throw new InvalidOperationException(BranchAccessRules.InactiveBranchMessage);
            if (!Includes(requested))
                throw new InvalidOperationException(BranchAccessRules.OperatorBranchNotPermittedMessage);
            return requested;
        }

        var pool = IsUnrestricted
            ? activeBranchIds
            : activeBranchIds.Where(BranchIds.Contains).ToArray();
        var preferred = defaultBranchId is int id && Includes(id) ? id : (int?)null;
        var picked = BranchAccessRules.PreselectedBranch(pool, preferred);
        if (picked is int only)
            return only;
        throw new InvalidOperationException(pool.Count == 0
            ? (activeBranchIds.Count == 0
                ? BranchAccessRules.CreateBlockedMessage
                : BranchAccessRules.OperatorBranchNotPermittedMessage)
            : BranchAccessRules.SelectBranchMessage);
    }
}
