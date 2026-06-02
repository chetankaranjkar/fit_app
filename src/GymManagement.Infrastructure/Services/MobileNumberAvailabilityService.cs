using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Core.Validation;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class MobileNumberAvailabilityService : IMobileNumberAvailabilityService
{
    private readonly ApplicationDbContext _db;

    public MobileNumberAvailabilityService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<MobileNumberAvailabilityDto> CheckAsync(
        string? mobileNumber,
        int? excludeUserId = null,
        CancellationToken cancellationToken = default)
    {
        var validationError = string.IsNullOrWhiteSpace(mobileNumber)
            ? PhoneNumberValidator.RequiredPhoneMessage
            : PhoneNumberValidator.GetValidationError(mobileNumber);
        if (validationError != null)
        {
            return new MobileNumberAvailabilityDto
            {
                IsAvailable = false,
                ValidationError = validationError,
            };
        }

        var normalized = PhoneNumberValidator.TryNormalizePhone(mobileNumber)!;
        var existing = await FindOwnerAsync(normalized, excludeUserId, cancellationToken);

        if (existing == null)
        {
            return new MobileNumberAvailabilityDto
            {
                IsAvailable = true,
                NormalizedMobileNumber = normalized,
            };
        }

        var (ownerId, firstName, lastName) = existing.Value;
        return new MobileNumberAvailabilityDto
        {
            IsAvailable = false,
            NormalizedMobileNumber = normalized,
            ExistingUserId = ownerId,
            ExistingUserName = $"{firstName} {lastName}".Trim(),
            ValidationError = PhoneNumberValidator.DuplicatePhoneMessage,
        };
    }

    public async Task<bool> IsMobileNumberAvailableAsync(
        string? mobileNumber,
        int? excludeUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await CheckAsync(mobileNumber, excludeUserId, cancellationToken);
        return result.IsAvailable;
    }

    public async Task EnsureAvailableOrThrowAsync(
        string mobileNumber,
        int? excludeUserId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await CheckAsync(mobileNumber, excludeUserId, cancellationToken);
        if (!string.IsNullOrEmpty(result.ValidationError) && result.ExistingUserId == null)
            throw new ArgumentException(result.ValidationError);

        if (!result.IsAvailable)
            throw new ConflictException(PhoneNumberValidator.DuplicatePhoneMessage);
    }

    /// <summary>Option A: any row with this phone blocks reuse, including soft-deleted users.</summary>
    private async Task<(int Id, string FirstName, string LastName)?> FindOwnerAsync(
        string normalizedPhone,
        int? excludeUserId,
        CancellationToken cancellationToken)
    {
        var row = await _db.Users.AsNoTracking()
            .Where(u => u.Phone == normalizedPhone && (!excludeUserId.HasValue || u.Id != excludeUserId.Value))
            .OrderBy(u => u.Id)
            .Select(u => new { u.Id, u.FirstName, u.LastName })
            .FirstOrDefaultAsync(cancellationToken);

        return row == null ? null : (row.Id, row.FirstName, row.LastName);
    }
}
