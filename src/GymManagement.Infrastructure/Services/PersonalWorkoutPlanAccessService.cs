using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services;

public sealed class PersonalWorkoutPlanAccessService : IPersonalWorkoutPlanAccessService
{
    public bool IsAdmin(IReadOnlyCollection<string> roleNames) =>
        roleNames.Any(r => string.Equals(r, "ADMIN", StringComparison.OrdinalIgnoreCase));

    public bool CanAccessPersonalPlan(
        int requestingUserId,
        IReadOnlyCollection<string> roleNames,
        WorkoutPlan plan)
    {
        if (!string.Equals(plan.PlanType, WorkoutPlanTypes.Personal, StringComparison.OrdinalIgnoreCase))
            return true;

        if (IsAdmin(roleNames))
            return true;

        if (roleNames.Any(r => string.Equals(r, "TRAINER", StringComparison.OrdinalIgnoreCase)))
            return false;

        return plan.AssignedToUserId == requestingUserId;
    }
}
