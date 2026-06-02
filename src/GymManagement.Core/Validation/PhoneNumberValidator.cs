using System.Text.RegularExpressions;

namespace GymManagement.Core.Validation;

public static partial class PhoneNumberValidator
{
    public const string RequiredPhoneMessage = "Phone number is required.";
    public const string InvalidLengthMessage = "Phone number must be 10 digits.";
    public const string InvalidStartDigitMessage = "Phone number must start with 6, 7, 8, or 9.";
    public const string DuplicatePhoneMessage = "This mobile number is already registered with another user.";

    [GeneratedRegex(@"^[6-9]\d{9}$", RegexOptions.Compiled)]
    private static partial Regex IndiaMobileRegex();

    public static string StripNonDigits(string? value) =>
        string.IsNullOrEmpty(value) ? string.Empty : new string(value.Where(char.IsDigit).ToArray());

    /// <summary>Normalize Indian mobile input to 10 digits, or null when empty.</summary>
    public static string? TryNormalizePhone(string? phone)
    {
        var digits = StripNonDigits(phone);
        if (digits.Length == 0)
            return null;

        if (digits.Length == 12 && digits.StartsWith("91", StringComparison.Ordinal))
            digits = digits[2..];
        else if (digits.Length == 11 && digits[0] == '0')
            digits = digits[1..];

        if (digits.Length != 10)
            return null;

        return IndiaMobileRegex().IsMatch(digits) ? digits : null;
    }

    public static bool IsValidIndianMobile(string? phone) =>
        TryNormalizePhone(phone) != null;

    public static string NormalizeRequiredPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            throw new ArgumentException(RequiredPhoneMessage);

        var normalized = TryNormalizePhone(phone);
        if (normalized == null)
            throw new ArgumentException(GetValidationError(phone) ?? InvalidLengthMessage);

        return normalized;
    }

    public static string? NormalizeOptionalPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return null;

        var normalized = TryNormalizePhone(phone);
        if (normalized == null)
            throw new ArgumentException(GetValidationError(phone) ?? InvalidLengthMessage);

        return normalized;
    }

    public static string? GetValidationError(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return RequiredPhoneMessage;

        var digits = StripNonDigits(phone);
        if (digits.Length == 0)
            return RequiredPhoneMessage;

        if (digits.Length == 12 && digits.StartsWith("91", StringComparison.Ordinal))
            digits = digits[2..];
        else if (digits.Length == 11 && digits[0] == '0')
            digits = digits[1..];

        if (digits.Length != 10)
            return InvalidLengthMessage;

        if (!IndiaMobileRegex().IsMatch(digits))
            return InvalidStartDigitMessage;

        return null;
    }
}
