using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services;

public interface IPersonalWorkoutPlanAccessService
{
    bool IsAdmin(IReadOnlyCollection<string> roleNames);

    /// <summary>Member may access only their own personal plan; admin all; trainer none.</summary>
    bool CanAccessPersonalPlan(
        int requestingUserId,
        IReadOnlyCollection<string> roleNames,
        WorkoutPlan plan);
}
