namespace GymManagement.Core.DTOs
{
    public static class NotificationWebhookEventTypes
    {
        public const string PaymentReceipt = "payment_receipt";
        public const string MembershipExpiring = "membership_expiring";

        /// <summary>Fired when an active diet plan is assigned or replaced for a member.</summary>
        public const string DietAssignmentAssigned = "diet_assignment_assigned";
    }

    public class PaymentReceiptNotificationDto
    {
        public int InvoiceId { get; set; }
        public int UserId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int? PaymentId { get; set; }
        public string? ReceiptNo { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public DateTime PaymentDateUtc { get; set; }
        public int UserMembershipId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? MemberPhone { get; set; }
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = "INR";
        public string? PlanName { get; set; }
        public IReadOnlyList<string>? AttachmentPaths { get; set; }
    }

    public class MembershipExpiringNotificationDto
    {
        public int UserId { get; set; }
        public int MembershipId { get; set; }
        public string? MemberName { get; set; }
        public string? MemberEmail { get; set; }
        public string? MemberPhone { get; set; }
        public string? PlanName { get; set; }
        public DateTime EndDateUtc { get; set; }
        public int DaysRemaining { get; set; }
    }

    /// <summary>Payload for outbound diet-assignment reminders (email/WhatsApp webhooks).</summary>
    public class DietAssignmentAssignedNotificationDto
    {
        public int UserId { get; set; }
        public string? MemberName { get; set; }
        public string? MemberEmail { get; set; }
        public string? MemberPhone { get; set; }
        public int DietPlanId { get; set; }
        public string? DietPlanName { get; set; }
        public DateTime StartDateUtc { get; set; }
        public DateTime? EndDateUtc { get; set; }
        public bool IsActive { get; set; }
        public string? Notes { get; set; }
    }

    public class PaymentDueReminderNotificationDto
    {
        public int UserId { get; set; }
        public int MembershipPaymentId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? MemberPhone { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal PendingAmount { get; set; }
        public DateTime? NextDueDateUtc { get; set; }
        public string? PlanName { get; set; }
    }

    public sealed class SendNotificationChannelResultDto
    {
        public bool Sent { get; set; }
        public string? Message { get; set; }
    }

    public sealed class SendPaymentReceiptResultDto
    {
        public SendNotificationChannelResultDto Email { get; set; } = new();
        public SendNotificationChannelResultDto Sms { get; set; } = new();
    }

    public sealed class SendPaymentReceiptRequestDto
    {
        /// <summary>email, sms, or both.</summary>
        public string Channel { get; set; } = "both";
    }
}
