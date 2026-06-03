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
}
