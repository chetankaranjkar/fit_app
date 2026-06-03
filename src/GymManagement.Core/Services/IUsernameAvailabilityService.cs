using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

/// <summary>Login username uniqueness against <c>AuthUsers.Email</c> (same rules as login lookup).</summary>
public interface IUsernameAvailabilityService
{
    Task<UsernameAvailabilityDto> CheckAsync(string? username, int? excludeUserId = null, CancellationToken cancellationToken = default);
}
