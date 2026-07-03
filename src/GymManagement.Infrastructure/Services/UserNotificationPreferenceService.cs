using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class UserNotificationPreferenceService : IUserNotificationPreferenceService
{
    private readonly ApplicationDbContext _db;

    public UserNotificationPreferenceService(ApplicationDbContext db) => _db = db;

    public async Task<bool> CanReceiveEmailAsync(int userId, CancellationToken ct = default)
    {
        if (userId <= 0)
            return false;

        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && !u.IsDeleted)
            .Select(u => u.ReceiveEmailNotifications)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> CanReceiveSmsAsync(int userId, CancellationToken ct = default)
    {
        if (userId <= 0)
            return false;

        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && !u.IsDeleted)
            .Select(u => u.ReceiveSmsNotifications)
            .FirstOrDefaultAsync(ct);
    }
}
