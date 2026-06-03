using GymManagement.Core.DTOs;

using GymManagement.Core.Exceptions;

using GymManagement.Core.Validation;

using GymManagement.Domain.Entities;

using GymManagement.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;



namespace GymManagement.Infrastructure.Services;



internal static class UserMembershipConflictGuard

{

    /// <summary>

    /// Blocks any new membership row while the member has an occupying status

    /// (Active, ActivePendingPayment, PartialPayment, Frozen, Pending, VoidPending).

    /// </summary>

    public static async Task EnsureNoActiveMembershipBeforeCreateAsync(

        ApplicationDbContext db,

        int userId,

        CancellationToken cancellationToken = default)

    {

        var existing = await FindOccupyingMembershipAsync(db, userId, excludeMembershipId: null, cancellationToken);

        if (existing == null)

            return;



        throw new ActiveMembershipConflictException(ToConflictDto(existing));

    }



    /// <summary>

    /// Blocks when <paramref name="status"/> occupies a slot and another occupying row exists (updates).

    /// </summary>

    public static async Task EnsureSingleActiveMembershipAsync(

        ApplicationDbContext db,

        int userId,

        MembershipStatus status,

        int? excludeMembershipId = null,

        CancellationToken cancellationToken = default)

    {

        if (!UserMembershipRules.OccupiesMembershipSlot(status))

            return;



        var existing = await FindOccupyingMembershipAsync(db, userId, excludeMembershipId, cancellationToken);

        if (existing == null)

            return;



        throw new ActiveMembershipConflictException(ToConflictDto(existing));

    }



    public static async Task<ActiveMembershipConflictDto?> TryGetActiveConflictAsync(

        ApplicationDbContext db,

        int userId,

        int? excludeMembershipId = null,

        CancellationToken cancellationToken = default)

    {

        var existing = await FindOccupyingMembershipAsync(db, userId, excludeMembershipId, cancellationToken);

        return existing == null ? null : ToConflictDto(existing);

    }



    private static async Task<UserMembership?> FindOccupyingMembershipAsync(

        ApplicationDbContext db,

        int userId,

        int? excludeMembershipId,

        CancellationToken cancellationToken)

    {

        return await db.UserMemberships

            .IgnoreQueryFilters()

            .AsNoTracking()

            .Include(m => m.Plan)

            .Where(m => !m.IsDeleted

                        && m.UserId == userId

                        && UserMembershipRules.OccupyingStatuses.Contains(m.Status)

                        && (!excludeMembershipId.HasValue || m.Id != excludeMembershipId.Value))

            .OrderByDescending(m => m.StartDate)

            .ThenByDescending(m => m.Id)

            .FirstOrDefaultAsync(cancellationToken);

    }



    private static ActiveMembershipConflictDto ToConflictDto(UserMembership existing) =>

        new()

        {

            Message = UserMembershipConflictCodes.Message,

            MembershipId = existing.Id,

            UserId = existing.UserId,

            PlanName = existing.Plan?.PlanName,

            ExistingStatus = existing.Status,

            StartDate = existing.StartDate,

            EndDate = existing.EndDate,

            RemainingDays = UserMembershipRules.ComputeRemainingDays(existing.EndDate),

        };



    public static bool IsDuplicateActiveMembershipIndex(Exception ex) =>

        (ex.InnerException?.Message ?? ex.Message).Contains(

            "IX_user_memberships_one_active_per_user",

            StringComparison.OrdinalIgnoreCase);

}


