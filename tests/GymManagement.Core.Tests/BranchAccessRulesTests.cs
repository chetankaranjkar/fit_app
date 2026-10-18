using GymManagement.Core.Branching;
using Xunit;

namespace GymManagement.Core.Tests;

public class BranchAccessRulesTests
{
    [Fact]
    public void NoActiveBranch_Message_DependsOnPermission()
    {
        Assert.Equal(BranchAccessRules.CreateBlockedMessage, BranchAccessRules.PrerequisiteMessage(true));
        Assert.Equal(BranchAccessRules.AskAdminMessage, BranchAccessRules.PrerequisiteMessage(false));
    }

    [Fact]
    public void OneBranch_IsPreselected()
    {
        Assert.Equal(7, BranchAccessRules.PreselectedBranch(new[] { 7 }, null));
        Assert.False(BranchAccessRules.RequiresExplicitSelection(new[] { 7 }, null));
    }

    [Fact]
    public void MultipleBranches_RequireSelectionUnlessDefaultIsValid()
    {
        Assert.Null(BranchAccessRules.PreselectedBranch(new[] { 1, 2 }, 9));
        Assert.True(BranchAccessRules.RequiresExplicitSelection(new[] { 1, 2 }, null));
        Assert.Equal(2, BranchAccessRules.PreselectedBranch(new[] { 1, 2 }, 2));
    }

    [Fact]
    public void Price_DoesNotFallBackToAnotherBranch()
    {
        Assert.Equal(1500m, BranchAccessRules.ResolvePlanPrice(1500m, true, 999m));
        var ex = Assert.Throws<InvalidOperationException>(() =>
            BranchAccessRules.ResolvePlanPrice(null, true, 999m));
        Assert.Equal(BranchAccessRules.MissingBranchPriceMessage, ex.Message);
    }

    [Fact]
    public void Price_UsesCatalogOnlyWhenNoBranchPricesExist()
    {
        Assert.Equal(999m, BranchAccessRules.ResolvePlanPrice(null, false, 999m));
    }

    [Fact]
    public void UnavailableBranch_DoesNotUseCatalogOrAnotherBranch()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            BranchAccessRules.ResolveAvailablePrice(true, false, 1500m, true, 999m));
        Assert.Equal(BranchAccessRules.PlanUnavailableMessage, ex.Message);

        var missing = Assert.Throws<InvalidOperationException>(() =>
            BranchAccessRules.ResolveAvailablePrice(false, false, null, true, 800m));
        Assert.Equal(BranchAccessRules.MissingBranchPriceMessage, missing.Message);
    }

    [Fact]
    public void Offers_RequireTheSelectedBranchPrice()
    {
        var plans = new[]
        {
            new BranchAccessRules.CatalogPlan(1, "Monthly", 30, 1000m, null),
            new BranchAccessRules.CatalogPlan(2, "Open", 30, 500m, null),
        };
        var prices = new[]
        {
            new BranchAccessRules.BranchPlanPrice(1, 10, 1500m, true),
            new BranchAccessRules.BranchPlanPrice(1, 11, 1800m, true),
        };

        var north = BranchAccessRules.OffersForBranch(plans, prices, 10);
        Assert.Equal(1500m, Assert.Single(north, o => o.PlanId == 1).Price);
        Assert.Equal(500m, Assert.Single(north, o => o.PlanId == 2).Price);
        Assert.DoesNotContain(north, o => o.Price == 1800m);

        var south = BranchAccessRules.OffersForBranch(plans, prices, 11);
        Assert.Equal(1800m, Assert.Single(south, o => o.PlanId == 1).Price);
    }

    [Fact]
    public void Renewal_AppendsAPeriodWithoutChangingTheOriginalCharge()
    {
        var original = new BranchAccessRules.BillingPeriodSnapshot(10, 1500m, "Plan");
        var renewal = new BranchAccessRules.BillingPeriodSnapshot(12, 1800m, "Renewal");
        var periods = BranchAccessRules.AppendBillingPeriod(new[] { original }, renewal);

        Assert.Equal(original, periods[0]);
        Assert.Equal(renewal, periods[1]);
        Assert.True(BranchAccessRules.PaymentMatchesOriginatingCharge(1500m, 10, original.AgreedPrice, original.SellingBranchId!.Value));
        Assert.False(BranchAccessRules.PaymentMatchesOriginatingCharge(1800m, 12, original.AgreedPrice, original.SellingBranchId!.Value));
        Assert.Equal(150m, BranchAccessRules.HistoricalDiscount(150m, 1800m));
    }

    [Fact]
    public void Coupon_AllBranchesIncludesUnlistedFutureBranch_SelectedDoesNot()
    {
        Assert.True(BranchAccessRules.CouponApplies(
            BranchAccessRules.CouponBranchScope.AllBranches, new[] { 1 }, 99, 4, 4));
        Assert.False(BranchAccessRules.CouponApplies(
            BranchAccessRules.CouponBranchScope.SelectedBranches, new[] { 1 }, 99, 4, 4));
        Assert.False(BranchAccessRules.CouponApplies(
            BranchAccessRules.CouponBranchScope.AllBranches, Array.Empty<int>(), 1, 4, 8));
    }

    [Fact]
    public void CheckIn_HonorsHomeSelectedAndAll_AndRejectsOtherOrganizations()
    {
        Assert.True(BranchAccessRules.MembershipAllowsVisit(
            BranchAccessRules.MembershipAccessScope.HomeOnly, 1, Array.Empty<int>(), 1, 4, 4));
        Assert.False(BranchAccessRules.MembershipAllowsVisit(
            BranchAccessRules.MembershipAccessScope.HomeOnly, 1, Array.Empty<int>(), 2, 4, 4));
        Assert.True(BranchAccessRules.MembershipAllowsVisit(
            BranchAccessRules.MembershipAccessScope.Selected, 1, new[] { 2 }, 2, 4, 4));
        Assert.True(BranchAccessRules.MembershipAllowsVisit(
            BranchAccessRules.MembershipAccessScope.AllOrganization, 1, Array.Empty<int>(), 3, 4, 4));
        Assert.False(BranchAccessRules.MembershipAllowsVisit(
            BranchAccessRules.MembershipAccessScope.AllOrganization, 1, Array.Empty<int>(), 3, 4, 9));
    }

    [Fact]
    public void Metrics_CountHomeMembersOnce_AndKeepVisitAndSaleSeparate()
    {
        var authorized = new[] { 1, 2 };
        Assert.Equal(2, BranchAccessRules.CountDistinctHomeMembers(new int?[] { 1, 1 }, false, authorized));
        Assert.Equal(1, BranchAccessRules.CountDistinctHomeMembers(new int?[] { 1, null, 9 }, false, authorized));
        Assert.False(BranchAccessRules.CountsAsHomeMember(null, false, authorized));
        Assert.True(BranchAccessRules.CountsVisitedAttendance(2, false, authorized));
        Assert.False(BranchAccessRules.CountsVisitedAttendance(null, false, authorized));
        Assert.True(BranchAccessRules.CountsSellingRevenue(1, false, authorized));
        Assert.False(BranchAccessRules.CountsSellingRevenue(9, false, authorized));
    }

    [Fact]
    public void Transfer_LeavesAccessAndBillsUnchangedUnlessTheDecisionSaysOtherwise()
    {
        Assert.Equal("HomeOnly", BranchAccessRules.AccessScopeAfterDecision("HomeOnly", "Unchanged"));
        Assert.Equal("AllOrganization", BranchAccessRules.AccessScopeAfterDecision("HomeOnly", "AllOrganization"));
        Assert.Equal("Unchanged", BranchAccessRules.NormalizeFinancialDecision(null));
        var blocked = Assert.Throws<InvalidOperationException>(() =>
            BranchAccessRules.NormalizeFinancialDecision("Reprice"));
        Assert.Equal(BranchAccessRules.TransferFinancialBlockedMessage, blocked.Message);
    }

    [Fact]
    public void Deactivation_RequiresAPolicyWhenPeopleOrObligationsRemain()
    {
        Assert.False(OperationalBranchRules.CanDeactivate(new BranchDeactivationCounts { HomeUsers = 2 }));
        Assert.False(OperationalBranchRules.CanDeactivate(new BranchDeactivationCounts { ActiveMembers = 1 }));
        Assert.False(OperationalBranchRules.CanDeactivate(new BranchDeactivationCounts { OpenBookings = 1 }));
    }

    [Fact]
    public void CrossOrganizationAssignment_IsRejected()
    {
        Assert.Throws<InvalidOperationException>(() => BranchAccessRules.EnsureSameOrganization(1, 2));
        BranchAccessRules.EnsureSameOrganization(1, null);
    }
}
