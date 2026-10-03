using System.Text.RegularExpressions;

namespace GymManagement.Core.Notifications;

/// <summary>Strips credentials from delivery errors shown to staff.</summary>
public static partial class NotificationDeliveryErrorSanitizer
{
    public static string? Sanitize(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return message;

        var text = PemBlockRegex().Replace(message, "[redacted credential]");
        text = SecretAssignmentRegex().Replace(text, "$1=[redacted]");
        text = BearerRegex().Replace(text, "Bearer [redacted]");
        text = ConnectionStringRegex().Replace(text, "$1=[redacted]");

        if (text.Length > 400)
            text = text[..400].TrimEnd() + "…";

        return text;
    }

    [GeneratedRegex(@"(?i)(password|pwd|passwd|secret|token|apikey|api[_-]?key|authorization|access[_-]?key|private[_-]?key)\s*[=:]\s*\S+")]
    private static partial Regex SecretAssignmentRegex();

    [GeneratedRegex(@"(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*")]
    private static partial Regex BearerRegex();

    [GeneratedRegex(@"(?i)(Password|Pwd|User ID|UserId)\s*=\s*[^;]+")]
    private static partial Regex ConnectionStringRegex();

    [GeneratedRegex(@"-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----")]
    private static partial Regex PemBlockRegex();
}
