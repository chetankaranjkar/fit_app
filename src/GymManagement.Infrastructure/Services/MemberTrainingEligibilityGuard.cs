using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Validation;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public static class MemberTrainingEligibilityGuard
{
    public static async Task EnsureCanAssignWorkoutOrDietAsync(IUnitOfWork unitOfWork, int userId)
    {
        var today = DateTime.UtcNow.Date;
        var memberships = await unitOfWork.UserMemberships
            .FindAsync(m => m.UserId == userId && !m.IsDeleted)
            .ConfigureAwait(false);

        var eligible = memberships.Any(m =>
            UserMembershipRules.AllowsWorkoutAndDietAssignment(m.Status, m.EndDate, today));

        if (!eligible)
            throw new BadRequestException(UserMembershipRules.TrainingAssignmentRequiresActiveMembershipMessage);
    }

    public static async Task EnsureCanAssignWorkoutOrDietAsync(ApplicationDbContext db, int userId)
    {
        var today = DateTime.UtcNow.Date;
        var eligible = await MemberTrainingEligibilityQueries.HasEligibleMembershipAsync(db, userId)
            .ConfigureAwait(false);

        if (!eligible)
            throw new BadRequestException(UserMembershipRules.TrainingAssignmentRequiresActiveMembershipMessage);
    }
}
