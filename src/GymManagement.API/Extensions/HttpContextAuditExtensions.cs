using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.API.Extensions;

public static class HttpContextAuditExtensions
{
    public static async Task<(int Id, string Name)> GetAuditActorAsync(
        this HttpContext http,
        ApplicationDbContext db,
        CancellationToken ct = default)
    {
        var userId = http.User.GetProfileUserId();
        if (userId == null)
        {
            var authUserId = http.User.GetAuthUserId();
            if (authUserId != null)
            {
                var auth = await db.AuthUsers.AsNoTracking()
                    .FirstOrDefaultAsync(a => a.Id == authUserId.Value, ct);
                userId = auth?.UserId;
            }
        }

        var resolvedId = userId ?? 0;
        if (resolvedId <= 0)
            return (0, "System");

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == resolvedId, ct);
        var name = user == null ? "User" : $"{user.FirstName} {user.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(name))
            name = $"User #{resolvedId}";
        return (resolvedId, name);
    }
}
