using GymManagement.Core.Search;
using Xunit;

namespace GymManagement.Core.Tests;

public class UserSearchTermTests
{
    [Theory]
    [InlineData("", UserSearchTermKind.None, true)]
    [InlineData("  ", UserSearchTermKind.None, true)]
    [InlineData("a", UserSearchTermKind.TextPrefix, false)]
    [InlineData("ab", UserSearchTermKind.TextPrefix, false)]
    public void Parse_handles_empty_and_minimum_length(string input, UserSearchTermKind kind, bool isEmpty)
    {
        var term = UserSearchTerm.Parse(input);
        Assert.Equal(kind, term.Kind);
        Assert.Equal(isEmpty, term.IsEmpty);
        Assert.Equal(!isEmpty && input.Trim().Length < UserSearchTerm.MinimumLength, term.IsTooShort);
    }

    [Fact]
    public void Parse_classifies_exact_phone()
    {
        var term = UserSearchTerm.Parse("9876543210");
        Assert.Equal(UserSearchTermKind.PhoneExact, term.Kind);
        Assert.Equal("9876543210", term.DigitsOnly);
    }

    [Fact]
    public void Parse_classifies_exact_aadhaar()
    {
        var term = UserSearchTerm.Parse("333333333333");
        Assert.Equal(UserSearchTermKind.AadhaarExact, term.Kind);
        Assert.Equal("333333333333", term.DigitsOnly);
    }

    [Fact]
    public void Parse_classifies_digit_prefix_for_partial_phone()
    {
        var term = UserSearchTerm.Parse("98765");
        Assert.Equal(UserSearchTermKind.DigitPrefix, term.Kind);
        Assert.Equal("98765", term.DigitsOnly);
    }

    [Fact]
    public void Parse_classifies_email_prefix()
    {
        var term = UserSearchTerm.Parse("member@gym.com");
        Assert.Equal(UserSearchTermKind.EmailPrefix, term.Kind);
        Assert.Equal("member@gym.com", term.Normalized);
    }

    [Fact]
    public void Parse_classifies_full_name()
    {
        var term = UserSearchTerm.Parse("Rahul Sharma");
        Assert.Equal(UserSearchTermKind.FullName, term.Kind);
        Assert.Equal("Rahul", term.FirstNamePrefix);
        Assert.Equal("Sharma", term.LastNamePrefix);
    }

    [Fact]
    public void Parse_classifies_single_name_prefix()
    {
        var term = UserSearchTerm.Parse("Rahul");
        Assert.Equal(UserSearchTermKind.TextPrefix, term.Kind);
        Assert.Equal("Rahul", term.FirstNamePrefix);
        Assert.Null(term.LastNamePrefix);
    }
}
