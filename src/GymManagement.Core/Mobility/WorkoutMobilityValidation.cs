namespace GymManagement.Core.Mobility;

public static class WorkoutMobilityValidation
{
    public static void EnsureUniqueIds(IEnumerable<int> ids, string itemLabel)
    {
        var list = ids.ToList();
        if (list.Count != list.Distinct().Count())
            throw new InvalidOperationException($"Duplicate {itemLabel} are not allowed.");
    }

    public static void EnsureUniqueDisplayOrders(IEnumerable<int> displayOrders, string scopeLabel)
    {
        var list = displayOrders.ToList();
        if (list.Count != list.Distinct().Count())
            throw new InvalidOperationException($"Display order must be unique per {scopeLabel}.");
    }

    public static void EnsureCategoryRequired(int? workoutCategoryId)
    {
        if (workoutCategoryId is not > 0)
            throw new InvalidOperationException("Workout category is required.");
    }
}
