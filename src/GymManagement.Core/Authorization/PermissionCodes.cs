namespace GymManagement.Core.Authorization;

/// <summary>Permission codes stored in JWT <c>permission</c> claims and in the <c>Permissions</c> table (seed + role assignments).</summary>
public static class PermissionCodes
{
    public const string Reports = "Reports";
    public const string CreateUsers = "CreateUsers";
    public const string Config = "Config";
    public const string Payments = "Payments";
    public const string TrainerAccess = "TrainerAccess";
    public const string UsersAccess = "UsersAccess";

    /// <summary>Create member / user accounts (e.g. POST <c>/api/Users</c>).</summary>
    public const string CREATE_MEMBER = "CREATE_MEMBER";

    /// <summary>Read attendance logs and statistics.</summary>
    public const string VIEW_ATTENDANCE = "VIEW_ATTENDANCE";

    /// <summary>Check-in, check-out, create, update, or delete attendance records.</summary>
    public const string MANAGE_ATTENDANCE = "MANAGE_ATTENDANCE";

    /// <summary>Update or delete users and related profile details.</summary>
    public const string MANAGE_MEMBERS = "MANAGE_MEMBERS";
    /// <summary>Reception CRM: leads, follow-ups, trials, conversion.</summary>
    public const string LeadsCrm = "LEADS_CRM";

    /// <summary>Trainer-scoped CRM: trials assigned to this trainer.</summary>
    public const string LeadsTrainer = "LEADS_TRAINER";

    /// <summary>Manage coupons / promo codes.</summary>
    public const string Coupons = "COUPONS";
}
