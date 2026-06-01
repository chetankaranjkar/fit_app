namespace GymManagement.Core.Authorization;

/// <summary>Permission codes stored in JWT <c>permission</c> claims and in the <c>Permissions</c> table (seed + role assignments).</summary>
public static class PermissionCodes
{
    public const string Reports = "Reports";
    public const string CreateUsers = "CreateUsers";
    public const string Config = "Config";
    public const string Payments = "Payments";

    /// <summary>Void membership payment transactions (manager+).</summary>
    public const string VoidPayment = "VOID_PAYMENT";

    /// <summary>Refund membership payment transactions (admin).</summary>
    public const string RefundPayment = "REFUND_PAYMENT";

    /// <summary>Approve or reject waive-off requests (admin).</summary>
    public const string ApproveWaiveOff = "APPROVE_WAIVE_OFF";

    /// <summary>View financial audit logs (admin).</summary>
    public const string ViewFinancialAudit = "VIEW_FINANCIAL_AUDIT";
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

    /// <summary>Retail products and POS sales.</summary>
    public const string RetailPos = "RETAIL_POS";

    /// <summary>Manage PT packages, assignments, and configuration.</summary>
    public const string ManagePtPackages = "MANAGE_PT_PACKAGES";

    /// <summary>Book, reschedule, and cancel PT sessions.</summary>
    public const string BookPtSessions = "BOOK_PT_SESSIONS";

    /// <summary>Manage trainer PT schedules and leave.</summary>
    public const string ManagePtSchedules = "MANAGE_PT_SCHEDULES";

    /// <summary>View trainer PT earnings and commissions.</summary>
    public const string ViewTrainerEarnings = "VIEW_TRAINER_EARNINGS";

    /// <summary>View PT reports and export data.</summary>
    public const string ViewPtReports = "VIEW_PT_REPORTS";
}
