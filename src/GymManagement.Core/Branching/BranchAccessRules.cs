namespace GymManagement.Core.Branching;

/// <summary>
/// Pure branch rules shared by the API, tests, and clients.
/// "All branches" always means every branch in one organization, including branches created later.
/// </summary>
public static class BranchAccessRules
{
    public const string CreateBlockedMessage = "Create a branch to continue.";

    public const string AskAdminMessage = "Ask an administrator to create a branch.";

    public const string MemberHomeBranchReason =
        "A home branch is required so the member's visits, billing, and staff access stay at the correct gym.";

    public const string LeadInterestedBranchReason =
        "An interested branch is required so follow-up and conversion stay at the correct gym.";

    public const string SignupBranchReason =
        "Choose the branch you will train at. Check-in and membership use that branch.";

    public const string OperatorBranchNotPermittedMessage = "You are not allowed to use that branch.";

    public const string BranchNotPermittedMessage =
        "This membership does not allow entry at this branch.";

    public const string MissingBranchPriceMessage =
        "No price is configured for this plan at the selected branch.";

    public const string PlanUnavailableMessage =
        "This plan is not available at the selected branch.";

    public const string PaymentBranchMessage =
        "This payment uses the branch recorded on the bill.";

    public const string SaleBranchRequiredMessage =
        "Assign a home branch before selling a membership.";

    public const string TransferFinancialBlockedMessage =
        "A transfer does not reprice bills or move balances. Choose Unchanged, then adjust billing in a separate audited action.";

    public const string TransferAccessDecisionMessage =
        "Access decision must be Unchanged, HomeOnly, Selected, or AllOrganization.";

    public const string SelectBranchMessage = "Select a branch.";

    public const string InactiveBranchMessage = "That branch is inactive and cannot accept new assignments or sales.";

    public const string CrossOrganizationMessage = "That branch belongs to a different organization.";

    public enum MembershipAccessScope
    {
        HomeOnly,
        Selected,
        AllOrganization,
    }

    public enum CouponBranchScope
    {
        SelectedBranches,
        AllBranches,
    }

    public static string PrerequisiteMessage(bool canManageBranches) =>
        canManageBranches ? CreateBlockedMessage : AskAdminMessage;

    public static bool IsClientBranchError(string? message) =>
        message is CreateBlockedMessage
            or AskAdminMessage
            or SelectBranchMessage
            or InactiveBranchMessage
            or CrossOrganizationMessage
            or OperatorBranchNotPermittedMessage
            or MissingBranchPriceMessage
            or PlanUnavailableMessage
            or SaleBranchRequiredMessage
            or PaymentBranchMessage
            or MemberHomeBranchReason
            or LeadInterestedBranchReason
            or SignupBranchReason;

    /// <summary>
    /// One available branch is always the selection. A default is used only when it is in the available set.
    /// Multiple branches without a valid default require an explicit choice.
    /// </summary>
    public static int? PreselectedBranch(IReadOnlyList<int> availableBranchIds, int? defaultBranchId)
    {
        if (availableBranchIds.Count == 1)
            return availableBranchIds[0];
        if (defaultBranchId is int id && availableBranchIds.Contains(id))
            return id;
        return null;
    }

    public static bool RequiresExplicitSelection(IReadOnlyList<int> availableBranchIds, int? defaultBranchId) =>
        availableBranchIds.Count > 1 && PreselectedBranch(availableBranchIds, defaultBranchId) == null;

    /// <summary>
    /// Uses the selected branch price when one exists.
    /// Uses the catalog price only when the plan has no branch prices at all.
    /// Never substitutes another branch's price.
    /// </summary>
    public static decimal ResolvePlanPrice(decimal? priceForSelectedBranch, bool planHasAnyBranchPrice, decimal catalogPrice)
    {
        if (priceForSelectedBranch is decimal price)
            return price;
        if (planHasAnyBranchPrice)
            throw new InvalidOperationException(MissingBranchPriceMessage);
        return catalogPrice;
    }

    /// <summary>
    /// A row that exists but is unavailable is not a missing price and is not the catalog price.
    /// </summary>
    public static decimal ResolveAvailablePrice(
        bool rowExists,
        bool isAvailable,
        decimal? price,
        bool planHasAnyBranchPrice,
        decimal catalogPrice)
    {
        if (rowExists && !isAvailable)
            throw new InvalidOperationException(PlanUnavailableMessage);
        return ResolvePlanPrice(rowExists && isAvailable ? price : null, planHasAnyBranchPrice, catalogPrice);
    }

    public sealed record CatalogPlan(int PlanId, string PlanName, int DurationDays, decimal CatalogPrice, string? Description);

    public sealed record BranchPlanPrice(int PlanId, int BranchId, decimal Price, bool IsAvailable);

    public sealed record PlanPriceOffer(int PlanId, string PlanName, int DurationDays, decimal Price, string? Description);

    public sealed record BillingPeriodSnapshot(int? SellingBranchId, decimal AgreedPrice, string FeeType);

    /// <summary>
    /// Plans with no branch rows use the catalog price at every branch.
    /// Once any branch row exists, only an available row for the selected branch is offered.
    /// </summary>
    public static IReadOnlyList<PlanPriceOffer> OffersForBranch(
        IReadOnlyList<CatalogPlan> plans,
        IReadOnlyList<BranchPlanPrice> prices,
        int branchId)
    {
        var byPlan = prices.GroupBy(p => p.PlanId).ToDictionary(g => g.Key, g => (IReadOnlyList<BranchPlanPrice>)g.ToList());
        var offers = new List<PlanPriceOffer>();
        foreach (var plan in plans)
        {
            if (!byPlan.TryGetValue(plan.PlanId, out var rows) || rows.Count == 0)
            {
                offers.Add(new PlanPriceOffer(plan.PlanId, plan.PlanName, plan.DurationDays, plan.CatalogPrice, plan.Description));
                continue;
            }

            var selected = rows.FirstOrDefault(r => r.BranchId == branchId);
            if (selected is not { IsAvailable: true })
                continue;
            offers.Add(new PlanPriceOffer(plan.PlanId, plan.PlanName, plan.DurationDays, selected.Price, plan.Description));
        }

        return offers;
    }

    /// <summary>A new period is appended. Earlier periods keep their branch and amount.</summary>
    public static IReadOnlyList<BillingPeriodSnapshot> AppendBillingPeriod(
        IReadOnlyList<BillingPeriodSnapshot> existing,
        BillingPeriodSnapshot renewal)
    {
        var next = new BillingPeriodSnapshot[existing.Count + 1];
        for (var i = 0; i < existing.Count; i++)
            next[i] = existing[i];
        next[^1] = renewal;
        return next;
    }

    public static bool PaymentMatchesOriginatingCharge(
        decimal paymentTotal,
        int? paymentBranchId,
        decimal chargePrice,
        int chargeBranchId) =>
        paymentTotal == chargePrice && paymentBranchId == chargeBranchId;

    /// <summary>The bill's stored discount stays the applied amount after later price changes.</summary>
    public static decimal HistoricalDiscount(decimal discountRecordedOnTheBill, decimal currentPlanPrice)
    {
        _ = currentPlanPrice;
        return discountRecordedOnTheBill;
    }

    public static bool CouponApplies(
        CouponBranchScope scope,
        IReadOnlyCollection<int> selectedBranchIds,
        int purchaseBranchId,
        int? couponOrganizationId,
        int? purchaseOrganizationId)
    {
        if (couponOrganizationId is int couponOrg
            && purchaseOrganizationId is int purchaseOrg
            && couponOrg != purchaseOrg)
        {
            return false;
        }

        if (scope == CouponBranchScope.AllBranches)
            return true;

        return selectedBranchIds.Contains(purchaseBranchId);
    }

    public static bool MembershipAllowsVisit(
        MembershipAccessScope scope,
        int? homeBranchId,
        IReadOnlyCollection<int> selectedBranchIds,
        int visitedBranchId,
        int? memberOrganizationId,
        int? visitedBranchOrganizationId)
    {
        if (memberOrganizationId is int memberOrg
            && visitedBranchOrganizationId is int branchOrg
            && memberOrg != branchOrg)
        {
            return false;
        }

        return scope switch
        {
            MembershipAccessScope.AllOrganization => true,
            MembershipAccessScope.HomeOnly => homeBranchId == visitedBranchId,
            MembershipAccessScope.Selected => homeBranchId == visitedBranchId || selectedBranchIds.Contains(visitedBranchId),
            _ => false,
        };
    }

    public static string NormalizeTransferDecision(string? decision, bool legacyUpdateAccess)
    {
        if (string.IsNullOrWhiteSpace(decision))
            return legacyUpdateAccess ? nameof(MembershipAccessScope.HomeOnly) : "Unchanged";
        var value = decision.Trim();
        if (value.Equals("None", StringComparison.OrdinalIgnoreCase) || value.Equals("Unchanged", StringComparison.OrdinalIgnoreCase))
            return "Unchanged";
        if (value.Equals(nameof(MembershipAccessScope.HomeOnly), StringComparison.OrdinalIgnoreCase))
            return nameof(MembershipAccessScope.HomeOnly);
        if (value.Equals(nameof(MembershipAccessScope.Selected), StringComparison.OrdinalIgnoreCase))
            return nameof(MembershipAccessScope.Selected);
        if (value.Equals(nameof(MembershipAccessScope.AllOrganization), StringComparison.OrdinalIgnoreCase))
            return nameof(MembershipAccessScope.AllOrganization);
        throw new ArgumentException(TransferAccessDecisionMessage);
    }

    public static string NormalizeFinancialDecision(string? decision)
    {
        if (string.IsNullOrWhiteSpace(decision)
            || decision.Equals("None", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Unchanged", StringComparison.OrdinalIgnoreCase))
            return "Unchanged";
        throw new InvalidOperationException(TransferFinancialBlockedMessage);
    }

    /// <summary>Returns the scope to store. Unchanged keeps the current value and does not expand access.</summary>
    public static string? AccessScopeAfterDecision(string? currentScope, string accessDecision) =>
        accessDecision == "Unchanged" ? currentScope : accessDecision;

    public static void EnsureSameOrganization(int? leftOrganizationId, int? rightOrganizationId)
    {
        if (leftOrganizationId is int left && rightOrganizationId is int right && left != right)
            throw new InvalidOperationException(CrossOrganizationMessage);
    }

    public static IReadOnlyList<int> DistinctBranchIds(IEnumerable<int> branchIds) =>
        branchIds.Where(id => id > 0).Distinct().ToArray();

    /// <summary>A person counts once, at their home branch. Extra branch assignments are not a second member.</summary>
    public static bool CountsAsHomeMember(int? homeBranchId, bool unrestricted, IReadOnlyCollection<int> authorizedBranchIds) =>
        unrestricted || (homeBranchId is int home && authorizedBranchIds.Contains(home));

    public static bool CountsVisitedAttendance(int? visitedBranchId, bool unrestricted, IReadOnlyCollection<int> authorizedBranchIds) =>
        unrestricted || (visitedBranchId is int visited && authorizedBranchIds.Contains(visited));

    public static bool CountsSellingRevenue(int? sellingBranchId, bool unrestricted, IReadOnlyCollection<int> authorizedBranchIds) =>
        unrestricted || (sellingBranchId is int selling && authorizedBranchIds.Contains(selling));

    public static int CountDistinctHomeMembers(IEnumerable<int?> homeBranchIds, bool unrestricted, IReadOnlyCollection<int> authorizedBranchIds) =>
        homeBranchIds.Count(home => CountsAsHomeMember(home, unrestricted, authorizedBranchIds));
}
