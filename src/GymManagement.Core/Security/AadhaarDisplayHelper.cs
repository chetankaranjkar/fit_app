namespace GymManagement.Core.Security;

public static class AadhaarDisplayHelper
{
    /// <summary>XXXX XXXX 1234</summary>
    public static string Mask(string? digitsOnly)
    {
        if (string.IsNullOrWhiteSpace(digitsOnly) || digitsOnly.Length < 4)
            return "—";

        var last4 = digitsOnly.Length >= 4
            ? digitsOnly[^4..]
            : digitsOnly;

        return $"XXXX XXXX {last4}";
    }

    public static bool CanViewFullAadhaar(IEnumerable<string>? appRoleNames)
    {
        if (appRoleNames == null)
            return false;

        foreach (var role in appRoleNames)
        {
            if (string.IsNullOrWhiteSpace(role))
                continue;

            var normalized = role.Trim().Replace("_", " ", StringComparison.Ordinal);
            if (normalized.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("SUPER ADMIN", StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}
