using GymManagement.Core.Authorization;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

/// <summary>
/// Profile tables (Trainer, Member, Staff) can outlive <c>UserRoles</c>. List endpoints must filter by current role assignment.
/// Expressions are inlined so EF Core can translate them to SQL (no custom static predicates).
/// </summary>
public static class RoleLinkedProfileQuery
{
    public static IQueryable<Trainer> WhereUserHasTrainerRole(this IQueryable<Trainer> query, ApplicationDbContext db) =>
        query.Where(t =>
            db.UserRoles.Any(ur =>
                ur.UserId == t.UserId
                && db.AppRoles.Any(r =>
                    r.Id == ur.RoleId
                    && r.Name == ApplicationRoleCodes.Trainer
                    && r.IsActive
                    && !r.IsDeleted)));

    public static IQueryable<Member> WhereUserHasMemberRole(this IQueryable<Member> query, ApplicationDbContext db) =>
        query.Where(m =>
            db.UserRoles.Any(ur =>
                ur.UserId == m.UserId
                && db.AppRoles.Any(r =>
                    r.Id == ur.RoleId
                    && r.Name == ApplicationRoleCodes.Member
                    && r.IsActive
                    && !r.IsDeleted)));

    public static IQueryable<Staff> WhereUserHasStaffLikeRole(this IQueryable<Staff> query, ApplicationDbContext db) =>
        query.Where(s =>
            db.UserRoles.Any(ur =>
                ur.UserId == s.UserId
                && db.AppRoles.Any(r =>
                    r.Id == ur.RoleId
                    && r.IsActive
                    && !r.IsDeleted
                    && (r.Name == ApplicationRoleCodes.Staff
                        || r.Name == ApplicationRoleCodes.Receptionist
                        || r.Name == ApplicationRoleCodes.Accountant))));

    public static async Task<HashSet<int>> GetUserIdsWithRoleAsync(
        ApplicationDbContext db,
        string roleCode,
        CancellationToken cancellationToken = default)
    {
        var ids = await (
            from ur in db.UserRoles.AsNoTracking()
            join r in db.AppRoles.AsNoTracking() on ur.RoleId equals r.Id
            where r.Name == roleCode && r.IsActive && !r.IsDeleted
            select ur.UserId).Distinct().ToListAsync(cancellationToken);

        return ids.ToHashSet();
    }
}
