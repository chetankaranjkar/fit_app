using GymManagement.Core.Authorization;
using GymManagement.Core.Branching;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class BranchAssignmentService : IBranchAssignmentService
{
    private readonly ApplicationDbContext _db;

    public BranchAssignmentService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task EnsureActiveBranchExistsAsync(CancellationToken cancellationToken = default)
    {
        var any = await _db.Branches.AsNoTracking().AnyAsync(b => b.IsActive, cancellationToken).ConfigureAwait(false);
        if (!any)
            throw new ArgumentException(BranchAccessRules.CreateBlockedMessage);
    }

    public async Task AssignNewOperationalUserAsync(
        int userId,
        int? requestedHomeBranchId,
        IReadOnlyCollection<int>? additionalBranchIds,
        bool memberOnly,
        CancellationToken cancellationToken = default)
    {
        var active = await _db.Branches.AsNoTracking()
            .Where(b => b.IsActive)
            .Select(b => new { b.Id, b.OrganizationId })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (active.Count == 0)
            throw new ArgumentException(BranchAccessRules.CreateBlockedMessage);

        var ids = active.Select(b => b.Id).ToArray();
        var homeId = requestedHomeBranchId ?? BranchAccessRules.PreselectedBranch(ids, null);
        if (homeId is null)
            throw new ArgumentException(BranchAccessRules.SelectBranchMessage);

        var home = active.FirstOrDefault(b => b.Id == homeId.Value);
        if (home == null)
            throw new ArgumentException(BranchAccessRules.InactiveBranchMessage);

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken).ConfigureAwait(false);
        BranchAccessRules.EnsureSameOrganization(user.OrganizationId, home.OrganizationId);
        if (user.OrganizationId == null && home.OrganizationId != null)
            user.OrganizationId = home.OrganizationId;

        var extras = BranchAccessRules.DistinctBranchIds(additionalBranchIds ?? Array.Empty<int>());
        if (memberOnly && extras.Count > 0)
            throw new ArgumentException("Members have one home branch. Visit access is set on the membership, not as extra staff branches.");

        foreach (var extraId in extras)
        {
            if (extraId == home.Id)
                continue;
            var extra = active.FirstOrDefault(b => b.Id == extraId)
                ?? throw new ArgumentException(BranchAccessRules.InactiveBranchMessage);
            BranchAccessRules.EnsureSameOrganization(user.OrganizationId, extra.OrganizationId);
        }

        user.HomeBranchId = home.Id;
        if (!memberOnly)
        {
            foreach (var extraId in extras.Where(id => id != home.Id))
            {
                _db.UserBranchAssignments.Add(new UserBranchAssignment
                {
                    UserId = user.Id,
                    BranchId = extraId,
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task SetPlanBranchPriceAsync(int planId, int branchId, decimal price, bool isAvailable, CancellationToken cancellationToken = default)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.");
        var branch = await _db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken).ConfigureAwait(false)
            ?? throw new ArgumentException("Branch was not found.");
        if (!branch.IsActive)
            throw new ArgumentException(BranchAccessRules.InactiveBranchMessage);
        var planExists = await _db.MembershipPlans.AnyAsync(p => p.Id == planId, cancellationToken).ConfigureAwait(false);
        if (!planExists)
            throw new ArgumentException("Plan was not found.");
        BranchAccessRules.EnsureSameOrganization(
            await _db.MembershipPlans.Where(p => p.Id == planId).Select(p => p.OrganizationId).FirstAsync(cancellationToken).ConfigureAwait(false),
            branch.OrganizationId);

        var row = await _db.MembershipPlanBranchPrices.FirstOrDefaultAsync(
            p => p.PlanId == planId && p.BranchId == branchId, cancellationToken).ConfigureAwait(false);
        if (row == null)
        {
            _db.MembershipPlanBranchPrices.Add(new MembershipPlanBranchPrice
            {
                PlanId = planId,
                BranchId = branchId,
                Price = price,
                IsAvailable = isAvailable,
            });
        }
        else
        {
            row.Price = price;
            row.IsAvailable = isAvailable;
        }
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<BranchAccessRules.PlanPriceOffer>> ListOffersAsync(
        int branchId,
        CancellationToken cancellationToken = default)
    {
        var branch = await _db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken).ConfigureAwait(false)
            ?? throw new ArgumentException("Branch was not found.");
        if (!branch.IsActive)
            throw new InvalidOperationException(BranchAccessRules.InactiveBranchMessage);

        var plans = await _db.MembershipPlans.AsNoTracking()
            .Where(p => !p.IsDeleted)
            .Select(p => new BranchAccessRules.CatalogPlan(p.Id, p.PlanName, p.DurationDays, p.Price, p.Description))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var prices = await _db.MembershipPlanBranchPrices.AsNoTracking()
            .Select(p => new BranchAccessRules.BranchPlanPrice(p.PlanId, p.BranchId, p.Price, p.IsAvailable))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return BranchAccessRules.OffersForBranch(plans, prices, branchId);
    }

    public async Task<IReadOnlyList<PlanBranchPriceSettingDto>> GetPlanBranchPricesAsync(
        int planId,
        IReadOnlyCollection<int>? limitToBranchIds,
        CancellationToken cancellationToken = default)
    {
        var planExists = await _db.MembershipPlans.AnyAsync(p => p.Id == planId, cancellationToken).ConfigureAwait(false);
        if (!planExists)
            throw new ArgumentException("Plan was not found.");

        var branches = _db.Branches.AsNoTracking();
        if (limitToBranchIds != null)
            branches = branches.Where(b => limitToBranchIds.Contains(b.Id));

        var branchRows = await branches
            .OrderBy(b => b.BranchName)
            .Select(b => new { b.Id, b.BranchName, b.IsActive })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var prices = await _db.MembershipPlanBranchPrices.AsNoTracking()
            .Where(p => p.PlanId == planId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return branchRows.Select(b =>
        {
            var price = prices.FirstOrDefault(p => p.BranchId == b.Id);
            return new PlanBranchPriceSettingDto
            {
                BranchId = b.Id,
                BranchName = b.BranchName,
                BranchActive = b.IsActive,
                Price = price?.Price,
                IsAvailable = price?.IsAvailable ?? false,
                IsConfigured = price != null,
            };
        }).ToList();
    }

    public async Task<decimal> ResolveSalePriceAsync(
        int planId,
        int branchId,
        decimal catalogPrice,
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.MembershipPlanBranchPrices.AsNoTracking()
            .Where(p => p.PlanId == planId)
            .Select(p => new { p.BranchId, p.Price, p.IsAvailable })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var selected = rows.FirstOrDefault(r => r.BranchId == branchId);
        return BranchAccessRules.ResolveAvailablePrice(
            selected != null,
            selected?.IsAvailable ?? false,
            selected?.Price,
            rows.Count > 0,
            catalogPrice);
    }

    public async Task<bool> MembershipAllowsBranchAsync(int userId, int visitedBranchId, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.HomeBranchId, u.OrganizationId })
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        if (user == null)
            return false;

        var branchOrg = await _db.Branches.AsNoTracking()
            .Where(b => b.Id == visitedBranchId)
            .Select(b => b.OrganizationId)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        var membershipRows = await _db.UserMemberships.AsNoTracking()
            .Where(m => m.UserId == userId && !m.IsDeleted)
            .OrderByDescending(m => m.EndDate)
            .Select(m => new { m.Id, m.AccessScope, m.Status, m.EndDate })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var allowing = membershipRows.FirstOrDefault(m =>
            GymManagement.Core.Validation.UserMembershipRules.AllowsGymCheckIn(m.Status, m.EndDate));
        var membership = allowing ?? membershipRows.FirstOrDefault();

        if (user.HomeBranchId == null && string.IsNullOrWhiteSpace(membership?.AccessScope))
            return true;

        var scope = ParseScope(membership?.AccessScope);
        IReadOnlyCollection<int> selected = membership == null
            ? Array.Empty<int>()
            : await _db.UserMembershipAccessBranches.AsNoTracking()
                .Where(a => a.UserMembershipId == membership.Id)
                .Select(a => a.BranchId)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

        return BranchAccessRules.MembershipAllowsVisit(
            scope,
            user.HomeBranchId,
            selected,
            visitedBranchId,
            user.OrganizationId,
            branchOrg);
    }

    public async Task<HashSet<int>?> AuthorizedBranchIdsForActorAsync(int? actorUserId, CancellationToken cancellationToken = default)
    {
        if (actorUserId is not int actorId)
            return null;

        var isAdmin = await _db.UserRoles.AsNoTracking()
            .Where(ur => ur.UserId == actorId && !ur.IsDeleted)
            .Join(_db.AppRoles.AsNoTracking().Where(r => !r.IsDeleted), ur => ur.RoleId, r => r.Id, (_, role) => role.Name)
            .AnyAsync(name => name == ApplicationRoleCodes.Admin, cancellationToken)
            .ConfigureAwait(false);
        if (isAdmin)
            return null;

        var ids = new HashSet<int>();
        var home = await _db.Users.AsNoTracking()
            .Where(u => u.Id == actorId)
            .Select(u => u.HomeBranchId)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        if (home is int homeId)
            ids.Add(homeId);
        var extras = await _db.UserBranchAssignments.AsNoTracking()
            .Where(a => a.UserId == actorId)
            .Select(a => a.BranchId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var id in extras)
            ids.Add(id);
        return ids;
    }

    public async Task TransferMemberAsync(
        int userId,
        int toBranchId,
        DateTime effectiveDate,
        string reason,
        int actingUserId,
        string? accessDecision,
        string? financialDecision,
        IReadOnlyCollection<int>? selectedBranchIds,
        bool legacyUpdateMembershipAccess = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A transfer reason is required.");
        var access = BranchAccessRules.NormalizeTransferDecision(accessDecision, legacyUpdateMembershipAccess);
        var financial = BranchAccessRules.NormalizeFinancialDecision(financialDecision);
        var destination = await _db.Branches.FirstOrDefaultAsync(b => b.Id == toBranchId, cancellationToken).ConfigureAwait(false)
            ?? throw new ArgumentException("Destination branch was not found.");
        if (!destination.IsActive)
            throw new ArgumentException(BranchAccessRules.InactiveBranchMessage);

        var allowed = await AuthorizedBranchIdsForActorAsync(actingUserId, cancellationToken).ConfigureAwait(false);
        if (allowed != null && !allowed.Contains(toBranchId))
            throw new ArgumentException(BranchAccessRules.OperatorBranchNotPermittedMessage);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken).ConfigureAwait(false)
            ?? throw new ArgumentException("Member was not found.");
        BranchAccessRules.EnsureSameOrganization(user.OrganizationId, destination.OrganizationId);

        var fromId = user.HomeBranchId;
        user.HomeBranchId = destination.Id;
        if (access != "Unchanged")
            await ApplyExplicitAccessDecisionAsync(userId, access, selectedBranchIds, cancellationToken).ConfigureAwait(false);

        _db.MemberBranchTransfers.Add(new MemberBranchTransfer
        {
            UserId = userId,
            FromBranchId = fromId,
            ToBranchId = destination.Id,
            EffectiveDate = effectiveDate,
            Reason = reason.Trim(),
            ActingUserId = actingUserId,
            AccessDecision = access,
            FinancialDecision = financial,
        });
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task ApplyExplicitAccessDecisionAsync(
        int userId,
        string access,
        IReadOnlyCollection<int>? selectedBranchIds,
        CancellationToken cancellationToken)
    {
        var membership = await _db.UserMemberships
            .Where(m => m.UserId == userId && !m.IsDeleted)
            .OrderByDescending(m => m.EndDate)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        if (membership == null)
            return;

        membership.AccessScope = BranchAccessRules.AccessScopeAfterDecision(membership.AccessScope, access);
        if (access == nameof(BranchAccessRules.MembershipAccessScope.Selected))
        {
            var ids = BranchAccessRules.DistinctBranchIds(selectedBranchIds ?? Array.Empty<int>());
            if (ids.Count == 0)
                throw new ArgumentException("Select the branches this membership may visit.");
            var existing = await _db.UserMembershipAccessBranches
                .Where(a => a.UserMembershipId == membership.Id)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            _db.UserMembershipAccessBranches.RemoveRange(existing);
            foreach (var branchId in ids)
            {
                _db.UserMembershipAccessBranches.Add(new UserMembershipAccessBranch
                {
                    UserMembershipId = membership.Id,
                    BranchId = branchId,
                });
            }
        }
    }

    private static BranchAccessRules.MembershipAccessScope ParseScope(string? raw)
    {
        if (string.Equals(raw, nameof(BranchAccessRules.MembershipAccessScope.AllOrganization), StringComparison.OrdinalIgnoreCase))
            return BranchAccessRules.MembershipAccessScope.AllOrganization;
        if (string.Equals(raw, nameof(BranchAccessRules.MembershipAccessScope.Selected), StringComparison.OrdinalIgnoreCase))
            return BranchAccessRules.MembershipAccessScope.Selected;
        return BranchAccessRules.MembershipAccessScope.HomeOnly;
    }
}
