using System.Text.RegularExpressions;

namespace GymManagement.Core.Validation;

public static partial class PhoneNumberValidator
{
    private const string InvalidPhoneMessage = "Phone number must be exactly 10 digits.";

    [GeneratedRegex(@"^\d{10}$", RegexOptions.Compiled)]
    private static partial Regex TenDigitRegex();

    public static bool IsValidTenDigitPhone(string phone) =>
        !string.IsNullOrWhiteSpace(phone) && TenDigitRegex().IsMatch(phone.Trim());

    public static string? NormalizeOptionalPhone(string? phone)
    {
        var trimmed = phone?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return null;
        if (!IsValidTenDigitPhone(trimmed))
            throw new ArgumentException(InvalidPhoneMessage);
        return trimmed;
    }
}
