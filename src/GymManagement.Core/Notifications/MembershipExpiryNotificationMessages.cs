namespace GymManagement.Core.Notifications;

public static class MembershipExpiryNotificationMessages
{
    public const string NotificationType = "membership_expiring";

    public static readonly int[] MilestoneDays = { 14, 7, 3, 1, 0 };

    public static string BuildMarker(int membershipId, int daysRemaining) =>
        $"[mid:{membershipId}][d:{daysRemaining}]";

    public static string? ExtractMarker(string? message)
    {
        if (string.IsNullOrEmpty(message))
            return null;
        var start = message.LastIndexOf("[mid:", StringComparison.Ordinal);
        if (start < 0)
            return null;
        return message[start..].Trim();
    }

    public static string StripMarker(string message) =>
        string.IsNullOrWhiteSpace(message)
            ? string.Empty
            : System.Text.RegularExpressions.Regex.Replace(
                message.Trim(),
                @"\s*\[mid:\d+\]\[d:\d+\]\s*$",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();

    public static (string Title, string Body) BuildCopy(string planName, string endLabel, int daysRemaining)
    {
        if (daysRemaining <= 0)
        {
            return (
                "Membership ends today",
                $"Your {planName} ends today ({endLabel}). Renew at reception to keep gym check-in access.");
        }

        if (daysRemaining == 1)
        {
            return (
                "Membership ends tomorrow",
                $"Your {planName} ends tomorrow ({endLabel}). Renew at reception before check-in is blocked.");
        }

        return (
            $"Membership expiring in {daysRemaining} days",
            $"Your {planName} ends on {endLabel}. Renew at reception to avoid interruption at check-in.");
    }
}
