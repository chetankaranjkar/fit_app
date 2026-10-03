namespace GymManagement.Core.Support;

/// <summary>
/// Builds member-facing help/privacy links and gym contact from stored values only.
/// Never substitutes placeholder phone, email, or policy text.
/// </summary>
public static class MemberSupportComposer
{
    public static MeSupportSnapshot Compose(
        string? gymName,
        string? organizationName,
        string? emailFromAddress,
        string? whatsAppSenderId,
        string? branchPhone,
        string? branchAddress,
        string? publicWebBaseUrl,
        string? privacyPolicyUrl)
    {
        return new MeSupportSnapshot(
            GymName: FirstNonBlank(gymName, organizationName),
            Email: NullIfBlank(emailFromAddress),
            Phone: NullIfBlank(branchPhone),
            Address: NullIfBlank(branchAddress),
            WhatsApp: NullIfBlank(whatsAppSenderId),
            HelpCenterUrl: HelpCenterUrlFromPublicBase(publicWebBaseUrl),
            PrivacyPolicyUrl: HttpUrlOrNull(privacyPolicyUrl));
    }

    public static string? HelpCenterUrlFromPublicBase(string? publicWebBaseUrl)
    {
        var baseUrl = HttpUrlOrNull(publicWebBaseUrl);
        if (baseUrl == null)
            return null;
        if (IsLoopback(baseUrl))
            return null;
        return $"{baseUrl.TrimEnd('/')}/help";
    }

    public static string? HttpUrlOrNull(string? value)
    {
        var trimmed = NullIfBlank(value);
        if (trimmed == null)
            return null;
        if (trimmed == "#")
            return null;
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            return null;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return null;
        return trimmed.TrimEnd('/');
    }

    public static string? FirstNonBlank(params string?[] values)
    {
        foreach (var value in values)
        {
            var trimmed = NullIfBlank(value);
            if (trimmed != null)
                return trimmed;
        }

        return null;
    }

    public static string? NullIfBlank(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static bool IsLoopback(string url) =>
        url.Contains("localhost", StringComparison.OrdinalIgnoreCase)
        || url.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || url.Contains("[::1]", StringComparison.OrdinalIgnoreCase);
}

public sealed record MeSupportSnapshot(
    string? GymName,
    string? Email,
    string? Phone,
    string? Address,
    string? WhatsApp,
    string? HelpCenterUrl,
    string? PrivacyPolicyUrl);
