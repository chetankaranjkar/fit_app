using GymManagement.Core.Notifications;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class MembershipExpiryNotificationMessagesTests
{
    [Theory]
    [InlineData(0, "Membership ends today")]
    [InlineData(1, "Membership ends tomorrow")]
    [InlineData(3, "Membership expiring in 3 days")]
    [InlineData(14, "Membership expiring in 14 days")]
    public void Build_copy_title_matches_milestone(int days, string expectedTitle)
    {
        var (title, _) = MembershipExpiryNotificationMessages.BuildCopy("Gold", "01 Jul 2026", days);
        Assert.Equal(expectedTitle, title);
    }

    [Fact]
    public void Marker_round_trip_for_dedupe()
    {
        var marker = MembershipExpiryNotificationMessages.BuildMarker(42, 7);
        var message = $"Your plan ends soon. {marker}";
        Assert.Equal(marker, MembershipExpiryNotificationMessages.ExtractMarker(message));
        Assert.Equal("Your plan ends soon.", MembershipExpiryNotificationMessages.StripMarker(message));
    }
}
