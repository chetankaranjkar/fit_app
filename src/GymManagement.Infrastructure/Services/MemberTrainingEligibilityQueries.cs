using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

/// <summary>
/// EF-translatable membership checks for workout/diet assignment.
/// Do not call <see cref="UserMembershipRules.AllowsWorkoutAndDietAssignment"/> inside IQueryable — it is not translatable.
/// </summary>
internal static class MemberTrainingEligibilityQueries
{
    public static Task<bool> HasEligibleMembershipAsync(ApplicationDbContext db, int userId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        return db.UserMemberships.AsNoTracking().AnyAsync(
            m =>
                m.UserId == userId
                && !m.IsDeleted
                && m.Status == MembershipStatus.Active
                && m.EndDate.Date >= today,
            ct);
    }
}
