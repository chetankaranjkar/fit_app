namespace GymManagement.Core.Notifications;

/// <summary>Stable template codes matching file names under Templates/Emails and Templates/Sms.</summary>
public static class NotificationTemplateCodes
{
    public const string PaymentSuccess = "PaymentSuccess";
    public const string MembershipActivated = "MembershipActivated";
    public const string MembershipRenewalReminder = "MembershipRenewalReminder";
    public const string MembershipExpired = "MembershipExpired";
    public const string Birthday = "Birthday";
    public const string WorkoutAssigned = "WorkoutAssigned";
    public const string TrainerAssigned = "TrainerAssigned";
    public const string ForgotPasswordOtp = "ForgotPasswordOTP";
    public const string Welcome = "Welcome";
    public const string InvoiceGenerated = "InvoiceGenerated";
    public const string PaymentDueReminder = "PaymentDueReminder";
    public const string Attendance = "Attendance";
    public const string PtSessionBooked = "PTSessionBooked";
    public const string DietAssignmentAssigned = "DietAssignmentAssigned";

    /// <summary>Legacy webhook event type → template code.</summary>
    public static string FromWebhookEventType(string eventType, int? daysRemaining = null) =>
        eventType switch
        {
            "payment_receipt" => PaymentSuccess,
            "membership_expiring" => daysRemaining is <= 0 ? MembershipExpired : MembershipRenewalReminder,
            "diet_assignment_assigned" => DietAssignmentAssigned,
            _ => eventType,
        };
}

public static class NotificationChannels
{
    public const string Email = "Email";
    public const string Sms = "SMS";
}

public static class NotificationOutboxStatuses
{
    public const string Pending = "Pending";
    public const string Processing = "Processing";
    public const string Sent = "Sent";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
}

public static class NotificationHistoryStatuses
{
    public const string Sent = "Sent";
    public const string Failed = "Failed";
    public const string Skipped = "Skipped";
}
