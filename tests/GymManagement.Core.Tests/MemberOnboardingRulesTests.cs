using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class MemberOnboardingRulesTests
{
    private static readonly DateTime Today = new(2026, 10, 2, 9, 0, 0, DateTimeKind.Utc);

    private static MembershipSnapshot Row(int id, MembershipStatus status, int startOffsetDays, int endOffsetDays) =>
        new(id, status, Today.Date.AddDays(startOffsetDays), Today.Date.AddDays(endOffsetDays), $"Plan {id}");

    [Fact]
    public void No_memberships_has_no_current_or_lapsed()
    {
        Assert.Null(MemberOnboardingRules.ResolveCurrentMembership(Array.Empty<MembershipSnapshot>(), Today));
        Assert.Null(MemberOnboardingRules.ResolveLapsedMembership(Array.Empty<MembershipSnapshot>(), Today));
    }

    [Fact]
    public void Pending_payment_membership_is_current_but_not_assignment_eligible()
    {
        var rows = new[] { Row(1, MembershipStatus.ActivePendingPayment, 0, 30) };

        var current = MemberOnboardingRules.ResolveCurrentMembership(rows, Today);

        Assert.Equal(1, current?.Id);
        Assert.False(UserMembershipRules.AllowsWorkoutAndDietAssignment(current!.Status, current.EndDate, Today));
    }

    [Fact]
    public void Paid_active_membership_wins_over_newer_unpaid_row()
    {
        var rows = new[]
        {
            Row(1, MembershipStatus.Active, -10, 20),
            Row(2, MembershipStatus.PartialPayment, -1, 60),
        };

        Assert.Equal(1, MemberOnboardingRules.ResolveCurrentMembership(rows, Today)?.Id);
    }

    [Fact]
    public void Active_row_past_end_date_is_lapsed_not_current()
    {
        var rows = new[] { Row(1, MembershipStatus.Active, -40, -1) };

        Assert.Null(MemberOnboardingRules.ResolveCurrentMembership(rows, Today));
        Assert.Equal(1, MemberOnboardingRules.ResolveLapsedMembership(rows, Today)?.Id);
    }

    [Fact]
    public void Membership_ending_today_is_still_current()
    {
        var rows = new[] { Row(1, MembershipStatus.Active, -30, 0) };

        Assert.Equal(1, MemberOnboardingRules.ResolveCurrentMembership(rows, Today)?.Id);
    }

    [Fact]
    public void Voided_and_cancelled_rows_are_not_reported_as_lapsed()
    {
        var rows = new[]
        {
            Row(1, MembershipStatus.Expired, -90, -60),
            Row(2, MembershipStatus.Voided, -20, 10),
            Row(3, MembershipStatus.Cancelled, -15, 15),
        };

        Assert.Null(MemberOnboardingRules.ResolveCurrentMembership(rows, Today));
        Assert.Equal(1, MemberOnboardingRules.ResolveLapsedMembership(rows, Today)?.Id);
    }

    [Fact]
    public void Display_membership_falls_back_to_latest_terminal_row()
    {
        var rows = new[]
        {
            Row(1, MembershipStatus.Voided, -60, -30),
            Row(2, MembershipStatus.Cancelled, -20, 10),
        };

        Assert.Equal(2, MemberOnboardingRules.ResolveDisplayMembership(rows, Today)?.Id);
    }

    [Fact]
    public void Display_membership_prefers_current_over_newer_terminal_row()
    {
        var rows = new[]
        {
            Row(1, MembershipStatus.PartialPayment, -5, 25),
            Row(2, MembershipStatus.Voided, 0, 60),
        };

        Assert.Equal(1, MemberOnboardingRules.ResolveDisplayMembership(rows, Today)?.Id);
    }

    [Theory]
    [InlineData(MembershipStatus.Cancelled, false)]
    [InlineData(MembershipStatus.Voided, false)]
    [InlineData(MembershipStatus.Transferred, false)]
    [InlineData(MembershipStatus.Expired, true)]
    [InlineData(MembershipStatus.Frozen, true)]
    [InlineData(MembershipStatus.ActivePendingPayment, true)]
    [InlineData(MembershipStatus.PartialPayment, true)]
    public void Payment_collection_is_closed_for_terminal_memberships(MembershipStatus status, bool allowed)
    {
        Assert.Equal(allowed, UserMembershipRules.AllowsPaymentCollection(status));
    }

    [Theory]
    [InlineData(MembershipStatus.ActivePendingPayment, true, MembershipStatus.Active)]
    [InlineData(MembershipStatus.ActivePendingPayment, false, MembershipStatus.PartialPayment)]
    [InlineData(MembershipStatus.PartialPayment, true, MembershipStatus.Active)]
    [InlineData(MembershipStatus.Expired, true, MembershipStatus.Active)]
    [InlineData(MembershipStatus.Frozen, true, MembershipStatus.Frozen)]
    [InlineData(MembershipStatus.Pending, true, MembershipStatus.Pending)]
    [InlineData(MembershipStatus.VoidPending, false, MembershipStatus.VoidPending)]
    public void Payment_never_lifts_a_freeze_or_pending_approval(
        MembershipStatus current,
        bool fullySettled,
        MembershipStatus expected)
    {
        Assert.Equal(expected, UserMembershipRules.StatusAfterPayment(current, fullySettled));
    }

    [Fact]
    public void Frozen_membership_is_current()
    {
        var rows = new[] { Row(1, MembershipStatus.Frozen, -5, 25) };

        Assert.Equal(MembershipStatus.Frozen, MemberOnboardingRules.ResolveCurrentMembership(rows, Today)?.Status);
        Assert.Null(MemberOnboardingRules.ResolveLapsedMembership(rows, Today));
    }
}
