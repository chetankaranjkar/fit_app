using GymManagement.Core.DTOs;

namespace GymManagement.Core.Validation;

/// <summary>
/// Shared CSV bulk-import rules: skip existing phone/email/Aadhaar (never upsert), fail invalid identity fields.
/// </summary>
public static class BulkMemberImportEvaluator
{
    public const string OutcomeAccepted = "accepted";
    public const string OutcomeSkipped = "skipped";
    public const string OutcomeFailed = "failed";

    public const string CodeDuplicateEmail = "duplicate_email";
    public const string CodeDuplicatePhone = "duplicate_phone";
    public const string CodeDuplicateAadhaar = "duplicate_aadhaar";
    public const string CodeDuplicateEmailInFile = "duplicate_email_in_file";
    public const string CodeDuplicatePhoneInFile = "duplicate_phone_in_file";
    public const string CodeDuplicateAadhaarInFile = "duplicate_aadhaar_in_file";

    public const string SkipDoesNotUpdate =
        "This import skips the row. It does not update the existing member.";

    public sealed class ExistingPerson
    {
        public int? UserId { get; init; }
        public string Label { get; init; } = string.Empty;
    }

    public sealed class ExistingIdentities
    {
        public Dictionary<string, ExistingPerson> Phones { get; init; } = new(StringComparer.Ordinal);
        public Dictionary<string, ExistingPerson> Emails { get; init; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, ExistingPerson> Aadhaar { get; init; } = new(StringComparer.Ordinal);
    }

    public sealed class AcceptedRow
    {
        public int Index { get; init; }
        public int SourceRowNumber { get; init; }
        public CreateUserDto Dto { get; init; } = null!;
        public string LoginId { get; init; } = string.Empty;
        public string Phone { get; init; } = string.Empty;
        public string? Aadhaar { get; init; }
        public string Password { get; init; } = string.Empty;
    }

    public sealed class Evaluation
    {
        public List<BulkImportMemberRowResultDto> Rows { get; } = new();
        public List<AcceptedRow> Accepted { get; } = new();
    }

    public static Evaluation Evaluate(IReadOnlyList<CreateUserDto> members, ExistingIdentities existing)
    {
        var result = new Evaluation();
        var batchPhones = new Dictionary<string, int>(StringComparer.Ordinal);
        var batchLogins = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var batchAadhaar = new Dictionary<string, int>(StringComparer.Ordinal);

        for (var i = 0; i < members.Count; i++)
        {
            var dto = members[i];
            var sourceRow = dto.SourceRowNumber is > 0 ? dto.SourceRowNumber.Value : i + 1;
            var loginId = ResolveLoginId(dto);
            var label = string.IsNullOrWhiteSpace(loginId) ? $"row {sourceRow}" : loginId.Trim();
            var email = loginId?.Trim();

            BulkImportMemberRowResultDto Fail(string field, string code, string message, string howToFix) =>
                new()
                {
                    SourceRowNumber = sourceRow,
                    Email = email,
                    Phone = dto.Phone,
                    Outcome = OutcomeFailed,
                    Field = field,
                    Code = code,
                    Message = message,
                    HowToFix = howToFix,
                };

            BulkImportMemberRowResultDto Skip(
                string field,
                string code,
                string message,
                string matchedOn,
                ExistingPerson? person,
                string? phone) =>
                new()
                {
                    SourceRowNumber = sourceRow,
                    Email = email,
                    Phone = phone ?? dto.Phone,
                    Outcome = OutcomeSkipped,
                    Field = field,
                    Code = code,
                    Message = message,
                    HowToFix = SkipDoesNotUpdate + " Use a different " + matchedOn + ", or omit this row.",
                    MatchedOn = matchedOn,
                    ExistingUserId = person?.UserId,
                    ExistingUserLabel = person?.Label,
                };

            if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
            {
                result.Rows.Add(Fail(
                    "firstName",
                    "required_name",
                    $"{label}: firstName and lastName are required.",
                    "Fill both name columns for this row."));
                continue;
            }

            if (string.IsNullOrWhiteSpace(loginId))
            {
                result.Rows.Add(Fail(
                    "email",
                    "required_email",
                    $"{label}: email is required for login.",
                    "Add a unique email. Portal login uses this value (same as single-member create)."));
                continue;
            }

            var password = dto.Password?.Trim();
            if (string.IsNullOrEmpty(password))
            {
                result.Rows.Add(Fail(
                    "password",
                    "required_password",
                    $"{label}: password is required.",
                    "Supply a password column or use the phone number (import defaults password to phone)."));
                continue;
            }

            if (password.Length < 6)
            {
                result.Rows.Add(Fail(
                    "password",
                    "password_length",
                    $"{label}: password must be at least 6 characters.",
                    "Use a password of at least 6 characters, or a 10-digit phone as the default password."));
                continue;
            }

            string normalizedPhone;
            try
            {
                normalizedPhone = PhoneNumberValidator.NormalizeRequiredPhone(dto.Phone);
            }
            catch (ArgumentException ex)
            {
                result.Rows.Add(Fail(
                    "phone",
                    "invalid_phone",
                    $"{label}: {ex.Message}",
                    "Use a 10-digit Indian mobile starting with 6, 7, 8, or 9. Spaces, +91, and leading 0 are accepted."));
                continue;
            }

            try
            {
                DateOfBirthValidator.EnsureValid(dto.DateOfBirth);
            }
            catch (ArgumentException ex)
            {
                result.Rows.Add(Fail(
                    "dateOfBirth",
                    "invalid_dob",
                    $"{label}: {ex.Message}",
                    "Use YYYY-MM-DD, year 1900 or later, and not a future date."));
                continue;
            }

            string? normalizedAadhaar;
            try
            {
                normalizedAadhaar = AadhaarNumberValidator.TryNormalizeOptionalAadhaar(dto.AadhaarNumber);
            }
            catch (ArgumentException ex)
            {
                result.Rows.Add(Fail(
                    "aadhaarNumber",
                    "invalid_aadhaar",
                    $"{label}: {ex.Message}",
                    "Leave Aadhaar blank or enter exactly 12 digits."));
                continue;
            }

            var loginKey = loginId.ToLowerInvariant();

            if (batchLogins.TryGetValue(loginKey, out var priorEmailRow))
            {
                result.Rows.Add(Skip(
                    "email",
                    CodeDuplicateEmailInFile,
                    $"Row {sourceRow}: duplicate email (also on row {priorEmailRow} of this file). {loginId} will be skipped.",
                    "email",
                    null,
                    normalizedPhone));
                continue;
            }

            if (existing.Emails.TryGetValue(loginId, out var existingEmail))
            {
                result.Rows.Add(Skip(
                    "email",
                    CodeDuplicateEmail,
                    $"Skipped (exists): {loginId} matches existing login {existingEmail.Label}.",
                    "email",
                    existingEmail,
                    normalizedPhone));
                continue;
            }

            if (batchPhones.TryGetValue(normalizedPhone, out var priorPhoneRow))
            {
                result.Rows.Add(Skip(
                    "phone",
                    CodeDuplicatePhoneInFile,
                    $"Row {sourceRow}: duplicate phone number (also on row {priorPhoneRow} of this file). {normalizedPhone} ({loginId}) will be skipped.",
                    "phone",
                    null,
                    normalizedPhone));
                continue;
            }

            if (existing.Phones.TryGetValue(normalizedPhone, out var existingPhone))
            {
                result.Rows.Add(Skip(
                    "phone",
                    CodeDuplicatePhone,
                    $"Duplicate phone number: {normalizedPhone} ({loginId}) matches {existingPhone.Label}.",
                    "phone",
                    existingPhone,
                    normalizedPhone));
                continue;
            }

            if (normalizedAadhaar != null)
            {
                if (batchAadhaar.TryGetValue(normalizedAadhaar, out var priorAadhaarRow))
                {
                    result.Rows.Add(Skip(
                        "aadhaarNumber",
                        CodeDuplicateAadhaarInFile,
                        $"Row {sourceRow}: Aadhaar is duplicated in this file (also on row {priorAadhaarRow}). This row will be skipped.",
                        "aadhaar",
                        null,
                        normalizedPhone));
                    continue;
                }

                if (existing.Aadhaar.TryGetValue(normalizedAadhaar, out var existingAadhaar))
                {
                    result.Rows.Add(Skip(
                        "aadhaarNumber",
                        CodeDuplicateAadhaar,
                        $"{label}: Aadhaar number is already registered to {existingAadhaar.Label}.",
                        "aadhaar",
                        existingAadhaar,
                        normalizedPhone));
                    continue;
                }

                batchAadhaar[normalizedAadhaar] = sourceRow;
            }

            batchLogins[loginKey] = sourceRow;
            batchPhones[normalizedPhone] = sourceRow;

            result.Accepted.Add(new AcceptedRow
            {
                Index = i,
                SourceRowNumber = sourceRow,
                Dto = dto,
                LoginId = loginId,
                Phone = normalizedPhone,
                Aadhaar = normalizedAadhaar,
                Password = password,
            });
            result.Rows.Add(new BulkImportMemberRowResultDto
            {
                SourceRowNumber = sourceRow,
                Email = loginId,
                Phone = normalizedPhone,
                Outcome = OutcomeAccepted,
                Message = "Ready to import as a new member (will not update an existing account).",
            });
        }

        return result;
    }

    public static void ApplyCounts(BulkImportMembersResultDto dto, Evaluation evaluation, bool dryRun, int imported)
    {
        dto.DryRun = dryRun;
        dto.Rows = evaluation.Rows;
        dto.WouldImport = evaluation.Accepted.Count;
        dto.Imported = dryRun ? 0 : imported;
        dto.Skipped = evaluation.Rows.Count(r => r.Outcome == OutcomeSkipped);
        dto.Failed = evaluation.Rows.Count(r => r.Outcome == OutcomeFailed);
        if (!dryRun && imported > 0)
        {
            foreach (var row in evaluation.Rows.Where(r => r.Outcome == OutcomeAccepted))
                row.Message = "Imported as a new member.";
        }

        dto.Log = evaluation.Rows
            .Where(r => r.Outcome != OutcomeAccepted)
            .Select(FormatLogLine)
            .ToList();
    }

    public static string FormatLogLine(BulkImportMemberRowResultDto row)
    {
        var extra = string.IsNullOrWhiteSpace(row.HowToFix) ? "" : $" Fix: {row.HowToFix}";
        return $"Row {row.SourceRowNumber}: {row.Message}{extra}";
    }

    private static string? ResolveLoginId(CreateUserDto dto)
    {
        var email = dto.Email?.Trim();
        if (!string.IsNullOrWhiteSpace(email))
            return email;
        return string.IsNullOrWhiteSpace(dto.Username) ? null : dto.Username.Trim();
    }
}
