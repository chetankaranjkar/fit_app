using System.Text.RegularExpressions;

namespace GymManagement.Core.Validation;

public static partial class AadhaarNumberValidator
{
    public const string InvalidAadhaarMessage = "Aadhaar number must be exactly 12 digits.";

    [GeneratedRegex(@"^\d{12}$", RegexOptions.Compiled)]
    private static partial Regex TwelveDigitRegex();

    /// <summary>Strip spaces, hyphens, and other non-digits.</summary>
    public static string StripFormatting(string value) =>
        new string(value.Where(char.IsDigit).ToArray());

    public static bool IsValidTwelveDigitAadhaar(string digitsOnly) =>
        !string.IsNullOrWhiteSpace(digitsOnly) && TwelveDigitRegex().IsMatch(digitsOnly);

    /// <summary>Returns normalized 12-digit string, or null when empty after strip. Throws when invalid.</summary>
    public static string? NormalizeOptionalAadhaar(string? aadhaar)
    {
        if (aadhaar == null)
            return null;

        var trimmed = aadhaar.Trim();
        if (trimmed.Length == 0)
            return null;

        var digits = StripFormatting(trimmed);
        if (!IsValidTwelveDigitAadhaar(digits))
            throw new ArgumentException(InvalidAadhaarMessage);

        return digits;
    }

    /// <summary>When input is null/whitespace, returns null without error.</summary>
    public static string? TryNormalizeOptionalAadhaar(string? aadhaar)
    {
        if (string.IsNullOrWhiteSpace(aadhaar))
            return null;
        return NormalizeOptionalAadhaar(aadhaar);
    }
}
