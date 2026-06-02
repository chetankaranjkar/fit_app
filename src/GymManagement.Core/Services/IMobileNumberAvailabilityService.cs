using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

/// <summary>
/// Global mobile number uniqueness (Users.Phone). Reserved even for soft-deleted users (Option A).
/// </summary>
public interface IMobileNumberAvailabilityService
{
    Task<MobileNumberAvailabilityDto> CheckAsync(string? mobileNumber, int? excludeUserId = null, CancellationToken cancellationToken = default);

    Task<bool> IsMobileNumberAvailableAsync(string? mobileNumber, int? excludeUserId = null, CancellationToken cancellationToken = default);

    Task EnsureAvailableOrThrowAsync(string mobileNumber, int? excludeUserId = null, CancellationToken cancellationToken = default);
}
