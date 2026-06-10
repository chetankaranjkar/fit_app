namespace GymManagement.Domain.Entities;

public static class WorkoutPlanTemplateModes
{
    public const string Simple = "SIMPLE";
    public const string Advanced = "ADVANCED";
    public const string Legacy = "LEGACY";

    public static string Normalize(string? mode)
    {
        if (string.IsNullOrWhiteSpace(mode)) return Legacy;
        if (string.Equals(mode, Simple, StringComparison.OrdinalIgnoreCase)) return Simple;
        if (string.Equals(mode, Advanced, StringComparison.OrdinalIgnoreCase)) return Advanced;
        return Legacy;
    }
}
