using GymManagement.Core.Branching;
using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IBranchAssignmentService
{
    Task EnsureActiveBranchExistsAsync(CancellationToken cancellationToken = default);

    Task AssignNewOperationalUserAsync(
        int userId,
        int? requestedHomeBranchId,
        IReadOnlyCollection<int>? additionalBranchIds,
        bool memberOnly,
        CancellationToken cancellationToken = default);

    Task<decimal> ResolveSalePriceAsync(int planId, int branchId, decimal catalogPrice, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BranchAccessRules.PlanPriceOffer>> ListOffersAsync(int branchId, CancellationToken cancellationToken = default);

    Task SetPlanBranchPriceAsync(int planId, int branchId, decimal price, bool isAvailable, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PlanBranchPriceSettingDto>> GetPlanBranchPricesAsync(
        int planId,
        IReadOnlyCollection<int>? limitToBranchIds,
        CancellationToken cancellationToken = default);

    Task<bool> MembershipAllowsBranchAsync(int userId, int visitedBranchId, CancellationToken cancellationToken = default);

    /// <summary>Null means organization-wide (administrator). An empty set means the actor has no branch yet.</summary>
    Task<HashSet<int>?> AuthorizedBranchIdsForActorAsync(int? actorUserId, CancellationToken cancellationToken = default);

    Task TransferMemberAsync(
        int userId,
        int toBranchId,
        DateTime effectiveDate,
        string reason,
        int actingUserId,
        string? accessDecision,
        string? financialDecision,
        IReadOnlyCollection<int>? selectedBranchIds,
        bool legacyUpdateMembershipAccess = false,
        CancellationToken cancellationToken = default);
}
