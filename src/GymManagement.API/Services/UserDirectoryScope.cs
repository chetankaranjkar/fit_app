using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.API.Services;

/// <summary>
/// Resolves whether the users directory should be limited to members assigned to the current coach.
/// </summary>
public static class UserDirectoryScope
{
    public static bool HasUsersAccess(HttpContext http) =>
        http.HasPermission(PermissionCodes.UsersAccess);

    public static bool HasTrainerAccess(HttpContext http) =>
        http.HasPermission(PermissionCodes.TrainerAccess);

    public static bool IsCoachOnlyRequested(HttpContext http) =>
        http.Request.Query.TryGetValue("assignedToCoachOnly", out var value)
        && bool.TryParse(value, out var coachOnly)
        && coachOnly;

    /// <summary>
    /// Coach filter applies when the caller lacks full users access, or explicitly requests coach scope.
    /// </summary>
    public static bool ShouldApplyCoachFilter(HttpContext http)
    {
        if (!HasTrainerAccess(http))
            return false;

        if (!HasUsersAccess(http))
            return true;

        return IsCoachOnlyRequested(http);
    }

    public static async Task<int?> ResolveTrainerProfileIdAsync(
        HttpContext http,
        ApplicationDbContext db,
        CancellationToken cancellationToken = default)
    {
        var profileUserId = http.GetJwtProfileUserId();
        if (!profileUserId.HasValue)
            return null;

        return await db.Trainers.AsNoTracking()
            .Where(t => !t.IsDeleted && t.UserId == profileUserId.Value)
            .Select(t => (int?)t.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public static async Task<bool> CanAccessMemberAsync(
        HttpContext http,
        ApplicationDbContext db,
        int targetUserId,
        CancellationToken cancellationToken = default)
    {
        if (!ShouldApplyCoachFilter(http))
            return true;

        var trainerProfileId = await ResolveTrainerProfileIdAsync(http, db, cancellationToken);
        if (!trainerProfileId.HasValue)
            return false;

        return await db.UserInstructors.AsNoTracking()
            .AnyAsync(
                ui => !ui.IsDeleted
                      && ui.IsActive
                      && !ui.EndDate.HasValue
                      && ui.TrainerId == trainerProfileId.Value
                      && ui.UserId == targetUserId,
                cancellationToken);
    }
}
