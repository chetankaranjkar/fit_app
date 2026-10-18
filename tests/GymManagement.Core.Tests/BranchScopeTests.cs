using GymManagement.Core.Branching;
using Xunit;

namespace GymManagement.Core.Tests;

public class BranchScopeTests
{
    [Fact]
    public void Administrator_SeesEveryAssignedBranch_AndUnassignedRows()
    {
        var scope = BranchScope.Unrestricted(actorUserId: 1);
        Assert.True(scope.Includes(4));
        Assert.True(scope.Includes(null));
    }

    [Fact]
    public void Staff_SeesOnlyAuthorizedBranches()
    {
        var scope = BranchScope.Restricted(9, new[] { 2, 5 });
        Assert.True(scope.Includes(2));
        Assert.False(scope.Includes(3));
        Assert.False(scope.Includes(null));
        Assert.True(scope.IncludesUser(9, homeBranchId: 8, additionalBranchIds: Array.Empty<int>()));
        Assert.True(scope.IncludesUser(20, homeBranchId: 8, additionalBranchIds: new[] { 5 }));
        Assert.False(scope.IncludesUser(20, homeBranchId: 8, additionalBranchIds: new[] { 6 }));
    }

    [Fact]
    public void SeveralBranches_RequireAnExplicitChoice()
    {
        var scope = BranchScope.Unrestricted(1);
        var error = Assert.Throws<InvalidOperationException>(() => scope.ResolveForNewRecord(null, new[] { 1, 2 }));
        Assert.Equal(BranchAccessRules.SelectBranchMessage, error.Message);
    }

    [Fact]
    public void SeveralBranches_UseAnAuthorizedDefault()
    {
        var scope = BranchScope.Restricted(4, new[] { 2, 5 });
        Assert.Equal(5, scope.ResolveForNewRecord(null, new[] { 2, 5, 9 }, defaultBranchId: 5));
        Assert.Equal(BranchAccessRules.SelectBranchMessage, Assert.Throws<InvalidOperationException>(() =>
            scope.ResolveForNewRecord(null, new[] { 2, 5 }, defaultBranchId: 9)).Message);
    }

    [Fact]
    public void NoActiveBranch_BlocksANewRecord()
    {
        var scope = BranchScope.Unrestricted(1);
        var error = Assert.Throws<InvalidOperationException>(() => scope.ResolveForNewRecord(null, Array.Empty<int>()));
        Assert.Equal(BranchAccessRules.CreateBlockedMessage, error.Message);
        Assert.Equal("Create a branch to continue.", BranchAccessRules.CreateBlockedMessage);
    }

    [Fact]
    public void OneActiveBranch_IsUsedForANewRecord()
    {
        var scope = BranchScope.Restricted(3, new[] { 7, 8 });
        Assert.Equal(7, scope.ResolveForNewRecord(null, new[] { 7 }));
    }

    [Fact]
    public void RequestedBranch_MustBeActiveAndAuthorized()
    {
        var scope = BranchScope.Restricted(3, new[] { 7 });
        Assert.Equal(7, scope.ResolveForNewRecord(7, new[] { 7, 8 }));
        Assert.Throws<InvalidOperationException>(() => scope.ResolveForNewRecord(8, new[] { 7, 8 }));
        Assert.Throws<InvalidOperationException>(() => scope.ResolveForNewRecord(7, new[] { 8 }));
    }

    [Fact]
    public void DifferentOrganizations_AreRejected()
    {
        var error = Assert.Throws<InvalidOperationException>(() => BranchAccessRules.EnsureSameOrganization(1, 2));
        Assert.Equal(BranchAccessRules.CrossOrganizationMessage, error.Message);
        BranchAccessRules.EnsureSameOrganization(null, 2);
    }

    [Fact]
    public void ConstraintEnforcement_StaysOffUntilReconciliation()
    {
        Assert.False(BranchConstraintEnforcementPlan.ApplyOnStartup);
        Assert.Contains("Users.HomeBranchId", BranchConstraintEnforcementPlan.ColumnsAfterReconciliation);
        Assert.DoesNotContain(BranchConstraintEnforcementPlan.ColumnsAfterReconciliation, column => column.StartsWith("Exercises", StringComparison.Ordinal));
    }

    [Fact]
    public void BackgroundWork_WithoutAnActor_IsOrganizationWide()
    {
        var scope = BranchScope.Unrestricted();
        Assert.True(scope.IsUnrestricted);
        Assert.Null(scope.ActorUserId);
        Assert.True(scope.Includes(1));
    }
}
