namespace GymManagement.Core.Branching;

/// <summary>
/// Classifies records and guards operational branch rules.
/// Historical rows keep the branch stored on them. Moving an asset or person does not rewrite those rows.
/// </summary>
public static class OperationalBranchRules
{
    public const string OrganizationWide = "OrganizationWide";
    public const string SelectedBranch = "SelectedBranch";

    public static bool ExpenseIsValid(bool organizationWide, int? branchId)
    {
        if (organizationWide)
            return branchId is null;
        return true;
    }

    public static string LockerKey(int? branchId, string lockerNumber) =>
        $"{branchId?.ToString() ?? "unassigned"}:{lockerNumber.Trim().ToUpperInvariant()}";

    public static bool LockerNumbersCollide(int? leftBranchId, string leftNumber, int? rightBranchId, string rightNumber)
    {
        if (!string.Equals(leftNumber.Trim(), rightNumber.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;
        if (leftBranchId is null || rightBranchId is null)
            return leftBranchId == rightBranchId;
        return leftBranchId == rightBranchId;
    }

    public static bool ScheduleOverlaps(DateTime startA, DateTime endA, DateTime startB, DateTime endB) =>
        startA < endB && startB < endA;

    public static bool CanDeactivate(BranchDeactivationCounts counts) =>
        counts.ActiveMembers == 0
        && counts.HomeUsers == 0
        && counts.StaffAssignments == 0
        && counts.OccupiedLockers == 0
        && counts.EquipmentAssets == 0
        && counts.StockOnHand == 0
        && counts.OpenBookings == 0
        && counts.OutstandingBills == 0;

    public static int StockAfterTransfer(int sourceOnHand, int quantity)
    {
        if (quantity <= 0)
            throw new InvalidOperationException("Transfer quantity must be positive.");
        if (sourceOnHand < quantity)
            throw new InvalidOperationException("The source branch does not have enough stock.");
        return sourceOnHand - quantity;
    }
}

public sealed class BranchDeactivationCounts
{
    public int ActiveMembers { get; init; }
    public int HomeUsers { get; init; }
    public int StaffAssignments { get; init; }
    public int OccupiedLockers { get; init; }
    public int EquipmentAssets { get; init; }
    public int StockOnHand { get; init; }
    public int OpenBookings { get; init; }
    public int OutstandingBills { get; init; }
}
