using GymManagement.Core.Branching;
using Xunit;

namespace GymManagement.Core.Tests;

public class OperationalBranchRulesTests
{
    [Fact]
    public void OrganizationWideExpense_CannotAlsoNameABranch()
    {
        Assert.False(OperationalBranchRules.ExpenseIsValid(organizationWide: true, branchId: 4));
        Assert.True(OperationalBranchRules.ExpenseIsValid(organizationWide: true, branchId: null));
        Assert.True(OperationalBranchRules.ExpenseIsValid(organizationWide: false, branchId: 4));
    }

    [Fact]
    public void LockerNumbers_AreUniqueInsideABranch()
    {
        Assert.True(OperationalBranchRules.LockerNumbersCollide(1, "101", 1, "101"));
        Assert.False(OperationalBranchRules.LockerNumbersCollide(1, "101", 2, "101"));
        Assert.True(OperationalBranchRules.LockerNumbersCollide(null, "101", null, "101"));
    }

    [Fact]
    public void TrainerOverlap_IgnoresWhichBranchTheSessionUses()
    {
        var start = new DateTime(2026, 10, 18, 9, 0, 0, DateTimeKind.Utc);
        Assert.True(OperationalBranchRules.ScheduleOverlaps(start, start.AddHours(1), start.AddMinutes(30), start.AddHours(2)));
        Assert.False(OperationalBranchRules.ScheduleOverlaps(start, start.AddHours(1), start.AddHours(1), start.AddHours(2)));
    }

    [Fact]
    public void StockTransfer_RejectsMoreThanTheSourceHas()
    {
        Assert.Equal(2, OperationalBranchRules.StockAfterTransfer(5, 3));
        Assert.Throws<InvalidOperationException>(() => OperationalBranchRules.StockAfterTransfer(1, 3));
    }

    [Fact]
    public void Deactivation_RequiresEveryOperationalCountToBeZero()
    {
        Assert.True(OperationalBranchRules.CanDeactivate(new BranchDeactivationCounts()));
        Assert.False(OperationalBranchRules.CanDeactivate(new BranchDeactivationCounts { EquipmentAssets = 1 }));
        Assert.False(OperationalBranchRules.CanDeactivate(new BranchDeactivationCounts { OutstandingBills = 1 }));
    }
}
