using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class ActiveMembershipValidationTests
{
    [Fact]
    public void Active_plus_new_active_requires_exclusive_slot()
    {
        Assert.True(UserMembershipRules.RequiresExclusiveActiveSlot(MembershipStatus.Active));
    }

    [Fact]
    public void Expired_plus_new_active_does_not_require_block_on_status_alone()
    {
        Assert.False(UserMembershipRules.RequiresExclusiveActiveSlot(MembershipStatus.Expired));
    }

    [Fact]
    public void Cancelled_allows_new_active_assignment()
    {
        Assert.False(UserMembershipRules.RequiresExclusiveActiveSlot(MembershipStatus.Cancelled));
    }

    [Fact]
    public void Voided_allows_new_active_assignment()
    {
        Assert.False(UserMembershipRules.RequiresExclusiveActiveSlot(MembershipStatus.Voided));
    }

    [Fact]
    public void ActivePendingPayment_occupies_membership_slot()
    {
        Assert.True(UserMembershipRules.OccupiesMembershipSlot(MembershipStatus.ActivePendingPayment));
    }

    [Fact]
    public void Expired_does_not_occupy_membership_slot()
    {
        Assert.False(UserMembershipRules.OccupiesMembershipSlot(MembershipStatus.Expired));
    }

    [Fact]
    public void Remaining_days_is_never_negative()
    {
        var days = UserMembershipRules.ComputeRemainingDays(DateTime.UtcNow.Date.AddDays(-3));
        Assert.Equal(0, days);
    }

    [Fact]
    public void Active_with_valid_end_date_allows_gym_check_in()
    {
        var end = DateTime.UtcNow.Date.AddDays(10);
        Assert.True(UserMembershipRules.AllowsGymCheckIn(MembershipStatus.Active, end));
    }

    [Fact]
    public void Expired_status_blocks_gym_check_in_even_if_end_date_future()
    {
        var end = DateTime.UtcNow.Date.AddDays(10);
        Assert.False(UserMembershipRules.AllowsGymCheckIn(MembershipStatus.Expired, end));
    }

    [Fact]
    public void Past_end_date_blocks_gym_check_in()
    {
        var end = DateTime.UtcNow.Date.AddDays(-1);
        Assert.False(UserMembershipRules.AllowsGymCheckIn(MembershipStatus.Active, end));
    }

    [Fact]
    public void Partial_payment_with_valid_dates_allows_gym_check_in()
    {
        var end = DateTime.UtcNow.Date.AddDays(5);
        Assert.True(UserMembershipRules.AllowsGymCheckIn(MembershipStatus.PartialPayment, end));
    }

    [Fact]
    public void Frozen_blocks_gym_check_in()
    {
        var end = DateTime.UtcNow.Date.AddDays(30);
        Assert.False(UserMembershipRules.AllowsGymCheckIn(MembershipStatus.Frozen, end));
    }
}
