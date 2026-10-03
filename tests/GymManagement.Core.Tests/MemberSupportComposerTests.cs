using GymManagement.Core.Support;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class MemberSupportComposerTests
{
    [Fact]
    public void Compose_omits_blank_and_placeholder_values()
    {
        var snapshot = MemberSupportComposer.Compose(
            gymName: "  ",
            organizationName: "Tiger Fitness",
            emailFromAddress: null,
            whatsAppSenderId: "  ",
            branchPhone: "9876543210",
            branchAddress: "",
            publicWebBaseUrl: "http://localhost:5173",
            privacyPolicyUrl: "#");

        Assert.Equal("Tiger Fitness", snapshot.GymName);
        Assert.Null(snapshot.Email);
        Assert.Null(snapshot.WhatsApp);
        Assert.Equal("9876543210", snapshot.Phone);
        Assert.Null(snapshot.Address);
        Assert.Null(snapshot.HelpCenterUrl);
        Assert.Null(snapshot.PrivacyPolicyUrl);
    }

    [Fact]
    public void Compose_builds_help_url_from_public_web_base()
    {
        var snapshot = MemberSupportComposer.Compose(
            gymName: "Tiger Fitness",
            organizationName: null,
            emailFromAddress: "desk@tigerfitness.tech",
            whatsAppSenderId: "919876543210",
            branchPhone: null,
            branchAddress: "Worli",
            publicWebBaseUrl: "https://tigerfitness.tech/",
            privacyPolicyUrl: "https://tigerfitness.tech/legal/privacy");

        Assert.Equal("https://tigerfitness.tech/help", snapshot.HelpCenterUrl);
        Assert.Equal("https://tigerfitness.tech/legal/privacy", snapshot.PrivacyPolicyUrl);
        Assert.Equal("desk@tigerfitness.tech", snapshot.Email);
        Assert.Equal("919876543210", snapshot.WhatsApp);
        Assert.Equal("Worli", snapshot.Address);
    }
}
