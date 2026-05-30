namespace GymManagement.Core.Supplements;

public static class SupplementCategories
{
    public const string Protein = "Protein";
    public const string Performance = "Performance";
    public const string Recovery = "Recovery";
    public const string Vitamins = "Vitamins";
    public const string Health = "Health";
    public const string Other = "Other";

    public static readonly IReadOnlyList<string> All =
    [
        Protein, Performance, Recovery, Vitamins, Health, Other,
    ];
}
