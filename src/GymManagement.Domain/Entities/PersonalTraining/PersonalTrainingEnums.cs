namespace GymManagement.Domain.Entities.PersonalTraining
{
    public enum PTPackageType
    {
        Monthly,
        SessionBased,
        Weekly,
        Custom,
    }

    public enum MemberPTPackageStatus
    {
        PendingPayment,
        Active,
        Frozen,
        Expired,
        Completed,
        Cancelled,
        Upgraded,
    }

    public enum PTSessionStatus
    {
        Booked,
        Completed,
        Cancelled,
        NoShow,
        Rescheduled,
    }

    public enum PTPaymentStatus
    {
        Pending,
        Partial,
        Paid,
        Refunded,
    }

    public enum TrainerCommissionType
    {
        Percentage,
        FixedPerSession,
        PackageBased,
    }

    public enum TrainerCommissionStatus
    {
        Pending,
        Approved,
        Paid,
        Reversed,
    }

    public enum TrainerPayoutStatus
    {
        Draft,
        Pending,
        Paid,
        Cancelled,
    }

    public enum PTNotificationType
    {
        SessionReminder,
        PackageExpiry,
        TrainerLeave,
        SessionCancelled,
        PaymentDue,
        General,
    }

    public enum MemberPTPackageHistoryAction
    {
        Purchased,
        Activated,
        SessionDeducted,
        SessionRestored,
        Frozen,
        Unfrozen,
        Extended,
        Upgraded,
        Cancelled,
        PaymentReceived,
        Refunded,
    }

    public enum InvoiceCategoryType
    {
        Membership,
        Product,
        PTPackage,
    }
}
