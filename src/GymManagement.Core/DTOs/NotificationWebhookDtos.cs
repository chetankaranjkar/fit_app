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
        public string InvoiceNumber { get; set; } = string.Empty;
        public int? PaymentId { get; set; }
        public string? ReceiptNo { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public DateTime PaymentDateUtc { get; set; }
        public int UserMembershipId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = "INR";
        public string? PlanName { get; set; }
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
}
