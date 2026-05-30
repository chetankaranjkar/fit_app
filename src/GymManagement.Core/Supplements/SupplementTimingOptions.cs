namespace GymManagement.Core.Supplements;

public static class SupplementTimingOptions
{
    public const string Morning = "Morning";
    public const string BeforeWorkout = "BeforeWorkout";
    public const string DuringWorkout = "DuringWorkout";
    public const string AfterWorkout = "AfterWorkout";
    public const string BeforeBed = "BeforeBed";

    public static readonly IReadOnlyList<string> All =
    [
        Morning, BeforeWorkout, DuringWorkout, AfterWorkout, BeforeBed,
    ];

    public static string GetLabel(string timing) => timing switch
    {
        Morning => "Morning",
        BeforeWorkout => "Before Workout",
        DuringWorkout => "During Workout",
        AfterWorkout => "After Workout",
        BeforeBed => "Before Bed",
        _ => timing,
    };
}
