using GymManagement.Core.Branching;

namespace GymManagement.Core.Services;

public sealed class BranchScopeOption
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class BranchScopeView
{
    public bool OrganizationWide { get; init; }
    public int? DefaultBranchId { get; init; }
    public IReadOnlyList<BranchScopeOption> Branches { get; init; } = Array.Empty<BranchScopeOption>();
}

public interface IBranchScopeService
{
    Task<BranchScope> CurrentAsync(CancellationToken cancellationToken = default);

    Task<BranchScopeView> DescribeAsync(CancellationToken cancellationToken = default);

    Task<AssignableBranch> RequireAssignableBranchAsync(int? requestedBranchId, int? recordOrganizationId, CancellationToken cancellationToken = default);

    Task<UnassignedBranchReport> UnassignedAsync(CancellationToken cancellationToken = default);

    Task<BranchAttributionMetrics> MetricsAsync(int? branchId, DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);

    Task<BulkBranchAssignmentResult> AssignMissingHomeBranchesAsync(IReadOnlyCollection<int> userIds, int branchId, CancellationToken cancellationToken = default);

    Task<BulkBranchAssignmentResult> AssignMissingInterestedBranchesAsync(IReadOnlyCollection<int> leadIds, int branchId, CancellationToken cancellationToken = default);
}

public sealed class AssignableBranch
{
    public int BranchId { get; init; }
    public int? OrganizationId { get; init; }
}

public sealed class UnassignedBranchReport
{
    public int UsersWithoutHomeBranch { get; init; }
    public int LeadsWithoutInterestedBranch { get; init; }
    public int AttendanceWithoutBranch { get; init; }
    public int EquipmentWithoutBranch { get; init; }
    public int LockersWithoutBranch { get; init; }
    public int MembershipsWithoutSellingBranch { get; init; }
    public int PaymentsWithoutSellingBranch { get; init; }
    public int PosOrdersWithoutBranch { get; init; }
    public int PtSessionsWithoutBranch { get; init; }
    public int ExpensesWithoutBranchDecision { get; init; }
    public bool ConstraintScriptReady { get; init; }
    public IReadOnlyList<string> CannotEstablishReliably { get; init; } = Array.Empty<string>();
}

public sealed class BranchAttributionMetrics
{
    public int? BranchId { get; init; }
    public DateTime FromDate { get; init; }
    public DateTime ToDate { get; init; }
    public int HomeBranchMemberCount { get; init; }
    public int VisitedBranchAttendanceCount { get; init; }
    public decimal SellingBranchRevenue { get; init; }
    public string MemberCountBasis { get; init; } = "HomeBranch";
    public string AttendanceBasis { get; init; } = "VisitedBranch";
    public string RevenueBasis { get; init; } = "SellingBranch";
}

public sealed class BulkBranchAssignmentResult
{
    public int Assigned { get; init; }
    public int AlreadyAssigned { get; init; }
    public int NotFound { get; init; }
}
