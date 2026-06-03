using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class UsernameAvailabilityService : IUsernameAvailabilityService
{
    public const string DuplicateUsernameMessage = "This email is already in use for login.";

    private readonly ApplicationDbContext _db;

    public UsernameAvailabilityService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<UsernameAvailabilityDto> CheckAsync(
        string? username,
        int? excludeUserId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = username?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return new UsernameAvailabilityDto { IsAvailable = true };
        }

        var lower = trimmed.ToLowerInvariant();
        var query = _db.AuthUsers.AsNoTracking().Include(a => a.User).AsQueryable();
        if (excludeUserId.HasValue)
            query = query.Where(a => !a.UserId.HasValue || a.UserId != excludeUserId.Value);

        var match = lower.Contains('@')
            ? await query.FirstOrDefaultAsync(a => a.Email.ToLower() == lower, cancellationToken)
            : await query.FirstOrDefaultAsync(
                a => a.Email.ToLower() == lower || a.Email.ToLower().StartsWith(lower + "@"),
                cancellationToken);

        if (match == null)
            return new UsernameAvailabilityDto { IsAvailable = true };

        var displayName = match.User != null
            ? $"{match.User.FirstName} {match.User.LastName}".Trim()
            : string.Empty;

        return new UsernameAvailabilityDto
        {
            IsAvailable = false,
            ValidationError = DuplicateUsernameMessage,
            ExistingUserId = match.UserId,
            ExistingUserName = string.IsNullOrWhiteSpace(displayName) ? match.Email : displayName,
        };
    }
}
