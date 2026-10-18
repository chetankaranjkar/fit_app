using GymManagement.Core.Branching;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class BranchScopeService : IBranchScopeService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUserAccessContext _access;
    private readonly IBranchAssignmentService _branches;

    public BranchScopeService(ApplicationDbContext db, ICurrentUserAccessContext access, IBranchAssignmentService branches)
    {
        _db = db;
        _access = access;
        _branches = branches;
    }

    public async Task<BranchScope> CurrentAsync(CancellationToken cancellationToken = default)
    {
        if (_access.ActorProfileUserId is not int actorId)
            return BranchScope.Unrestricted();

        var ids = await _branches.AuthorizedBranchIdsForActorAsync(actorId, cancellationToken).ConfigureAwait(false);
        return ids is null
            ? BranchScope.Unrestricted(actorId)
            : BranchScope.Restricted(actorId, ids);
    }

    public async Task<BranchScopeView> DescribeAsync(CancellationToken cancellationToken = default)
    {
        var scope = await CurrentAsync(cancellationToken).ConfigureAwait(false);
        var branches = await _db.Branches.AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.BranchName)
            .Select(b => new BranchScopeOption { Id = b.Id, Name = b.BranchName })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        if (!scope.IsUnrestricted)
            branches = branches.Where(b => scope.BranchIds.Contains(b.Id)).ToList();
        var defaultBranchId = await ActorDefaultBranchIdAsync(scope, cancellationToken).ConfigureAwait(false);
        if (defaultBranchId is int preferred && branches.All(b => b.Id != preferred))
            defaultBranchId = null;
        return new BranchScopeView
        {
            OrganizationWide = scope.IsUnrestricted && scope.ActorUserId != null,
            DefaultBranchId = defaultBranchId,
            Branches = branches,
        };
    }

    public async Task<AssignableBranch> RequireAssignableBranchAsync(int? requestedBranchId, int? recordOrganizationId, CancellationToken cancellationToken = default)
    {
        var scope = await CurrentAsync(cancellationToken).ConfigureAwait(false);
        var active = await _db.Branches.AsNoTracking()
            .Where(b => b.IsActive)
            .Select(b => new { b.Id, b.OrganizationId })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var branchId = scope.ResolveForNewRecord(
            requestedBranchId,
            active.Select(b => b.Id).ToArray(),
            await ActorDefaultBranchIdAsync(scope, cancellationToken).ConfigureAwait(false));
        var branch = active.First(b => b.Id == branchId);
        BranchAccessRules.EnsureSameOrganization(recordOrganizationId, branch.OrganizationId);
        return new AssignableBranch { BranchId = branch.Id, OrganizationId = branch.OrganizationId };
    }

    public async Task<UnassignedBranchReport> UnassignedAsync(CancellationToken cancellationToken = default)
    {
        var scope = await CurrentAsync(cancellationToken).ConfigureAwait(false);
        if (!scope.IsUnrestricted)
            throw new InvalidOperationException("Only an organization-wide administrator can open the unassigned-branch report.");

        var report = new UnassignedBranchReport
        {
            UsersWithoutHomeBranch = await _db.Users.CountAsync(u => u.HomeBranchId == null, cancellationToken).ConfigureAwait(false),
            LeadsWithoutInterestedBranch = await _db.GymLeads.CountAsync(l => l.InterestedBranchId == null, cancellationToken).ConfigureAwait(false),
            AttendanceWithoutBranch = await _db.AttendanceLogs.CountAsync(a => a.BranchId == null, cancellationToken).ConfigureAwait(false),
            EquipmentWithoutBranch = await _db.GymOpsEquipment.CountAsync(e => e.BranchId == null, cancellationToken).ConfigureAwait(false),
            LockersWithoutBranch = await _db.Set<Domain.Entities.LockerMgmt.Locker>().CountAsync(l => l.BranchId == null, cancellationToken).ConfigureAwait(false),
            MembershipsWithoutSellingBranch = await _db.UserMemberships.CountAsync(m => m.SellingBranchId == null, cancellationToken).ConfigureAwait(false),
            PaymentsWithoutSellingBranch = await _db.MembershipPayments.CountAsync(p => p.SellingBranchId == null, cancellationToken).ConfigureAwait(false),
            PosOrdersWithoutBranch = await _db.RetailPosOrders.CountAsync(o => o.BranchId == null, cancellationToken).ConfigureAwait(false),
            PtSessionsWithoutBranch = await _db.PTSessions.CountAsync(s => s.BranchId == null, cancellationToken).ConfigureAwait(false),
            ExpensesWithoutBranchDecision = await _db.GymOpsExpenses.CountAsync(
                e => !e.IsOrganizationWide && e.BranchId == null, cancellationToken).ConfigureAwait(false),
            CannotEstablishReliably = Array.Empty<string>(),
        };
        var ready = report.UsersWithoutHomeBranch == 0
            && report.LeadsWithoutInterestedBranch == 0
            && report.AttendanceWithoutBranch == 0
            && report.EquipmentWithoutBranch == 0
            && report.LockersWithoutBranch == 0
            && report.MembershipsWithoutSellingBranch == 0
            && report.PaymentsWithoutSellingBranch == 0
            && report.PosOrdersWithoutBranch == 0
            && report.PtSessionsWithoutBranch == 0
            && report.ExpensesWithoutBranchDecision == 0;
        return new UnassignedBranchReport
        {
            UsersWithoutHomeBranch = report.UsersWithoutHomeBranch,
            LeadsWithoutInterestedBranch = report.LeadsWithoutInterestedBranch,
            AttendanceWithoutBranch = report.AttendanceWithoutBranch,
            EquipmentWithoutBranch = report.EquipmentWithoutBranch,
            LockersWithoutBranch = report.LockersWithoutBranch,
            MembershipsWithoutSellingBranch = report.MembershipsWithoutSellingBranch,
            PaymentsWithoutSellingBranch = report.PaymentsWithoutSellingBranch,
            PosOrdersWithoutBranch = report.PosOrdersWithoutBranch,
            PtSessionsWithoutBranch = report.PtSessionsWithoutBranch,
            ExpensesWithoutBranchDecision = report.ExpensesWithoutBranchDecision,
            ConstraintScriptReady = ready,
            CannotEstablishReliably = ready ? Array.Empty<string>() : DescribeUnattributable(report),
        };
    }

    public async Task<BranchAttributionMetrics> MetricsAsync(int? branchId, DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default)
    {
        var scope = await CurrentAsync(cancellationToken).ConfigureAwait(false);
        var rangeFrom = fromDate.Date;
        var rangeTo = toDate.Date;
        if (rangeTo < rangeFrom) (rangeFrom, rangeTo) = (rangeTo, rangeFrom);
        var rangeEnd = rangeTo.AddDays(1);
        int[] ids;
        if (branchId is int selected)
        {
            if (!scope.Includes(selected))
                throw new InvalidOperationException(BranchAccessRules.OperatorBranchNotPermittedMessage);
            ids = new[] { selected };
        }
        else if (scope.IsUnrestricted)
        {
            ids = await _db.Branches.AsNoTracking().Select(b => b.Id).ToArrayAsync(cancellationToken).ConfigureAwait(false);
        }
        else
        {
            ids = scope.BranchIds.ToArray();
        }

        var members = await _db.Users.AsNoTracking()
            .CountAsync(u => u.HomeBranchId != null && ids.Contains(u.HomeBranchId.Value), cancellationToken)
            .ConfigureAwait(false);
        var attendance = await _db.AttendanceLogs.AsNoTracking()
            .CountAsync(a => a.BranchId != null && ids.Contains(a.BranchId.Value) && a.AttendanceDate >= rangeFrom && a.AttendanceDate < rangeEnd, cancellationToken)
            .ConfigureAwait(false);
        var revenue = await (
            from t in _db.MembershipPaymentTransactions.AsNoTracking()
            join p in _db.MembershipPayments.AsNoTracking() on t.PaymentId equals p.Id
            where !t.IsDeleted && !p.IsDeleted
                  && t.Status == GymManagement.Domain.Entities.MembershipPaymentTransactionStatus.Completed
                  && t.TransactionDate >= rangeFrom && t.TransactionDate < rangeEnd
                  && p.SellingBranchId != null && ids.Contains(p.SellingBranchId.Value)
            select t.TransactionAmount
        ).SumAsync(cancellationToken).ConfigureAwait(false);

        return new BranchAttributionMetrics
        {
            BranchId = branchId,
            FromDate = rangeFrom,
            ToDate = rangeTo,
            HomeBranchMemberCount = members,
            VisitedBranchAttendanceCount = attendance,
            SellingBranchRevenue = revenue,
        };
    }

    public async Task<BulkBranchAssignmentResult> AssignMissingHomeBranchesAsync(IReadOnlyCollection<int> userIds, int branchId, CancellationToken cancellationToken = default)
    {
        await RequireAdministratorAsync(cancellationToken).ConfigureAwait(false);
        await RequireAssignableBranchAsync(branchId, null, cancellationToken).ConfigureAwait(false);
        var ids = userIds.Distinct().ToArray();
        var users = await _db.Users.Where(u => ids.Contains(u.Id)).ToListAsync(cancellationToken).ConfigureAwait(false);
        var assigned = 0;
        var already = 0;
        foreach (var user in users)
        {
            if (user.HomeBranchId != null)
            {
                already++;
                continue;
            }
            user.HomeBranchId = branchId;
            assigned++;
        }
        if (assigned > 0)
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new BulkBranchAssignmentResult
        {
            Assigned = assigned,
            AlreadyAssigned = already,
            NotFound = ids.Length - users.Count,
        };
    }

    public async Task<BulkBranchAssignmentResult> AssignMissingInterestedBranchesAsync(IReadOnlyCollection<int> leadIds, int branchId, CancellationToken cancellationToken = default)
    {
        await RequireAdministratorAsync(cancellationToken).ConfigureAwait(false);
        await RequireAssignableBranchAsync(branchId, null, cancellationToken).ConfigureAwait(false);
        var ids = leadIds.Distinct().ToArray();
        var leads = await _db.GymLeads.Where(l => ids.Contains(l.Id)).ToListAsync(cancellationToken).ConfigureAwait(false);
        var assigned = 0;
        var already = 0;
        foreach (var lead in leads)
        {
            if (lead.InterestedBranchId != null)
            {
                already++;
                continue;
            }
            lead.InterestedBranchId = branchId;
            assigned++;
        }
        if (assigned > 0)
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new BulkBranchAssignmentResult
        {
            Assigned = assigned,
            AlreadyAssigned = already,
            NotFound = ids.Length - leads.Count,
        };
    }

    private async Task RequireAdministratorAsync(CancellationToken cancellationToken)
    {
        var scope = await CurrentAsync(cancellationToken).ConfigureAwait(false);
        if (!scope.IsUnrestricted || scope.ActorUserId == null)
            throw new InvalidOperationException("Only an organization-wide administrator can assign missing branches.");
    }

    private static IReadOnlyList<string> DescribeUnattributable(UnassignedBranchReport report)
    {
        var notes = new List<string>();
        if (report.AttendanceWithoutBranch > 0)
            notes.Add($"{report.AttendanceWithoutBranch} attendance rows have no visited branch. Do not copy the member's home branch onto them.");
        if (report.MembershipsWithoutSellingBranch > 0 || report.PaymentsWithoutSellingBranch > 0)
            notes.Add($"{report.MembershipsWithoutSellingBranch} memberships and {report.PaymentsWithoutSellingBranch} payments have no selling branch. Amounts stay as recorded.");
        if (report.PosOrdersWithoutBranch > 0)
            notes.Add($"{report.PosOrdersWithoutBranch} sales have no branch. Do not split organization stock to invent one.");
        if (report.EquipmentWithoutBranch > 0 || report.LockersWithoutBranch > 0)
            notes.Add($"{report.EquipmentWithoutBranch} equipment assets and {report.LockersWithoutBranch} lockers have no current branch.");
        if (report.PtSessionsWithoutBranch > 0)
            notes.Add($"{report.PtSessionsWithoutBranch} PT sessions have no venue branch.");
        if (report.ExpensesWithoutBranchDecision > 0)
            notes.Add($"{report.ExpensesWithoutBranchDecision} expenses are neither organization-wide nor assigned to a branch.");
        return notes;
    }

    private async Task<int?> ActorDefaultBranchIdAsync(BranchScope scope, CancellationToken cancellationToken)
    {
        if (scope.ActorUserId is not int actorId)
            return null;
        var home = await _db.Users.AsNoTracking()
            .Where(u => u.Id == actorId)
            .Select(u => u.HomeBranchId)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        return home is int id && scope.Includes(id) ? id : null;
    }
}
