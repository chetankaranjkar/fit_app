using GymManagement.Core.DTOs;
using GymManagement.Core.Validation;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class BulkMemberImportEvaluatorTests
{
    private static CreateUserDto Row(
        int sourceRow,
        string email,
        string phone,
        string? aadhaar = null,
        string? password = null,
        DateTime? dob = null) =>
        new()
        {
            SourceRowNumber = sourceRow,
            FirstName = "Ada",
            LastName = "Lovelace",
            Email = email,
            Phone = phone,
            AadhaarNumber = aadhaar,
            Password = password ?? phone,
            DateOfBirth = dob ?? new DateTime(1990, 5, 15, 0, 0, 0, DateTimeKind.Utc),
            Gender = "Female",
            IsActive = true,
        };

    [Fact]
    public void Valid_row_is_accepted_and_not_upserted()
    {
        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[] { Row(2, "ada@test.local", "9876543210") },
            new BulkMemberImportEvaluator.ExistingIdentities());

        var accepted = Assert.Single(evaluation.Accepted);
        Assert.Equal("9876543210", accepted.Phone);
        Assert.Equal(BulkMemberImportEvaluator.OutcomeAccepted, Assert.Single(evaluation.Rows).Outcome);
        Assert.Contains("will not update", evaluation.Rows[0].Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Duplicate_phone_against_existing_user_is_skipped_with_user_id()
    {
        var existing = new BulkMemberImportEvaluator.ExistingIdentities();
        existing.Phones["9876543210"] = new BulkMemberImportEvaluator.ExistingPerson
        {
            UserId = 42,
            Label = "Riya Sharma (#42)",
        };

        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[] { Row(2, "new@test.local", "9876543210") },
            existing);

        Assert.Empty(evaluation.Accepted);
        var row = Assert.Single(evaluation.Rows);
        Assert.Equal(BulkMemberImportEvaluator.OutcomeSkipped, row.Outcome);
        Assert.Equal("phone", row.MatchedOn);
        Assert.Equal(42, row.ExistingUserId);
        Assert.Contains("Riya Sharma (#42)", row.Message);
        Assert.Contains("does not update", row.HowToFix, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Duplicate_email_against_existing_login_is_skipped()
    {
        var existing = new BulkMemberImportEvaluator.ExistingIdentities();
        existing.Emails["ada@test.local"] = new BulkMemberImportEvaluator.ExistingPerson
        {
            UserId = 7,
            Label = "Ada Lovelace (#7)",
        };

        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[] { Row(3, "ada@test.local", "9123456789") },
            existing);

        var row = Assert.Single(evaluation.Rows);
        Assert.Equal(BulkMemberImportEvaluator.OutcomeSkipped, row.Outcome);
        Assert.Equal("email", row.MatchedOn);
        Assert.Equal(7, row.ExistingUserId);
        Assert.StartsWith("Skipped (exists):", row.Message);
    }

    [Fact]
    public void Duplicate_aadhaar_is_skipped_not_updated()
    {
        var existing = new BulkMemberImportEvaluator.ExistingIdentities();
        existing.Aadhaar["123412341234"] = new BulkMemberImportEvaluator.ExistingPerson
        {
            UserId = 9,
            Label = "Existing (#9)",
        };

        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[] { Row(2, "fresh@test.local", "9988776655", "123412341234") },
            existing);

        var row = Assert.Single(evaluation.Rows);
        Assert.Equal(BulkMemberImportEvaluator.OutcomeSkipped, row.Outcome);
        Assert.Equal("aadhaar", row.MatchedOn);
        Assert.Contains("already registered", row.Message);
    }

    [Fact]
    public void Second_in_file_phone_is_skipped_with_prior_row()
    {
        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[]
            {
                Row(2, "one@test.local", "9876543210"),
                Row(3, "two@test.local", "9876543210"),
            },
            new BulkMemberImportEvaluator.ExistingIdentities());

        Assert.Single(evaluation.Accepted);
        Assert.Equal(BulkMemberImportEvaluator.OutcomeSkipped, evaluation.Rows[1].Outcome);
        Assert.Contains("also on row 2", evaluation.Rows[1].Message);
    }

    [Fact]
    public void Invalid_phone_is_failed_with_fix_hint()
    {
        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[] { Row(4, "bad@test.local", "1234567890", password: "import-pass") },
            new BulkMemberImportEvaluator.ExistingIdentities());

        var row = Assert.Single(evaluation.Rows);
        Assert.Equal(BulkMemberImportEvaluator.OutcomeFailed, row.Outcome);
        Assert.Equal("phone", row.Field);
        Assert.False(string.IsNullOrWhiteSpace(row.HowToFix));
    }

    [Fact]
    public void ApplyCounts_sets_would_import_on_dry_run_without_imported()
    {
        var evaluation = BulkMemberImportEvaluator.Evaluate(
            new[] { Row(2, "ada@test.local", "9876543210") },
            new BulkMemberImportEvaluator.ExistingIdentities());
        var dto = new BulkImportMembersResultDto();

        BulkMemberImportEvaluator.ApplyCounts(dto, evaluation, dryRun: true, imported: 0);

        Assert.True(dto.DryRun);
        Assert.Equal(0, dto.Imported);
        Assert.Equal(1, dto.WouldImport);
        Assert.Empty(dto.Log);
    }
}
