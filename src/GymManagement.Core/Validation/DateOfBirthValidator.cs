namespace GymManagement.Core.Validation;

public static class DateOfBirthValidator
{
    public static readonly DateTime MinDateUtc = new(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    public const string InvalidYearMessage = "Date of birth year must be between 1900 and 9999.";
    public const string FutureDateMessage = "Date of birth cannot be in the future.";
    public const string TooOldMessage = "Date of birth must be on or after 1900-01-01.";

    public static void EnsureValid(DateTime dateOfBirth)
    {
        var date = dateOfBirth.Date;
        if (date.Year < 1900 || date.Year > 9999)
            throw new ArgumentException(InvalidYearMessage);
        if (date < MinDateUtc.Date)
            throw new ArgumentException(TooOldMessage);
        if (date > DateTime.UtcNow.Date)
            throw new ArgumentException(FutureDateMessage);
    }
}
