using GymManagement.Core.Validation;

namespace GymManagement.Core.Search;

/// <summary>
/// Classifies a member search box term so EF can use index-friendly predicates (prefix / exact match).
/// </summary>
public sealed class UserSearchTerm
{
    public const int MinimumLength = 2;
    public const int RecommendedMinimumLength = 3;

    public string Raw { get; }
    public string Normalized { get; }
    public string DigitsOnly { get; }
    public bool IsDigitsOnly { get; }
    public bool IsEmpty { get; }
    public bool IsTooShort { get; }
    public UserSearchTermKind Kind { get; }
    public string? FirstNamePrefix { get; }
    public string? LastNamePrefix { get; }

    private UserSearchTerm(
        string raw,
        string normalized,
        string digitsOnly,
        bool isDigitsOnly,
        UserSearchTermKind kind,
        string? firstNamePrefix,
        string? lastNamePrefix)
    {
        Raw = raw;
        Normalized = normalized;
        DigitsOnly = digitsOnly;
        IsDigitsOnly = isDigitsOnly;
        Kind = kind;
        FirstNamePrefix = firstNamePrefix;
        LastNamePrefix = lastNamePrefix;
        IsEmpty = normalized.Length == 0;
        IsTooShort = normalized.Length > 0 && normalized.Length < MinimumLength;
    }

    public static UserSearchTerm Parse(string? search)
    {
        var normalized = search?.Trim() ?? string.Empty;
        if (normalized.Length == 0)
            return new UserSearchTerm(string.Empty, string.Empty, string.Empty, false, UserSearchTermKind.None, null, null);

        var digitsOnly = AadhaarNumberValidator.StripFormatting(normalized);
        var isDigitsOnly = digitsOnly.Length > 0 && digitsOnly.Length == normalized.Count(char.IsDigit);

        if (isDigitsOnly && digitsOnly.Length == 10)
            return new UserSearchTerm(search!, normalized, digitsOnly, true, UserSearchTermKind.PhoneExact, null, null);

        if (isDigitsOnly && digitsOnly.Length == 12)
            return new UserSearchTerm(search!, normalized, digitsOnly, true, UserSearchTermKind.AadhaarExact, null, null);

        if (isDigitsOnly && digitsOnly.Length >= MinimumLength)
            return new UserSearchTerm(search!, normalized, digitsOnly, true, UserSearchTermKind.DigitPrefix, null, null);

        if (normalized.Contains('@', StringComparison.Ordinal))
            return new UserSearchTerm(search!, normalized, digitsOnly, isDigitsOnly, UserSearchTermKind.EmailPrefix, null, null);

        var parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length >= 2)
        {
            return new UserSearchTerm(
                search!,
                normalized,
                digitsOnly,
                isDigitsOnly,
                UserSearchTermKind.FullName,
                parts[0],
                string.Join(' ', parts.Skip(1)));
        }

        return new UserSearchTerm(
            search!,
            normalized,
            digitsOnly,
            isDigitsOnly,
            UserSearchTermKind.TextPrefix,
            normalized,
            null);
    }
}

public enum UserSearchTermKind
{
    None,
    PhoneExact,
    AadhaarExact,
    DigitPrefix,
    EmailPrefix,
    FullName,
    TextPrefix,
}
