namespace GymManagement.Core.Supplements;

public static class MemberSupplementStatuses
{
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";

    public static readonly IReadOnlyList<string> All =
    [
        Active, Completed, Cancelled, Expired,
    ];
}
