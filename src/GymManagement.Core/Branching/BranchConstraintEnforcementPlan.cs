namespace GymManagement.Core.Branching;

/// <summary>
/// Columns that become required only after an administrator has reconciled the unassigned report.
/// This stage is prepared and must not be applied by startup migration.
/// </summary>
public static class BranchConstraintEnforcementPlan
{
    public const bool ApplyOnStartup = false;

    public static IReadOnlyList<string> ColumnsAfterReconciliation { get; } =
    [
        "Users.HomeBranchId",
        "gym_leads.InterestedBranchId",
        "AttendanceLogs.BranchId",
        "GymOps_Equipment.BranchId",
        "GymOps_MaintenanceLogs.BranchId",
        "LockerMgmt_Lockers.BranchId",
        "LockerMgmt_Assignments.BranchId",
        "GymOps_CleaningLogs.BranchId",
        "Retail_PosOrders.BranchId",
        "Retail_InventoryTransactions.BranchId",
        "PT_Sessions.BranchId",
        "PT_MemberPackages.SellingBranchId",
        "PT_PackageInvoices.SellingBranchId",
        "user_memberships.SellingBranchId",
        "membership_payments.SellingBranchId",
    ];
}
