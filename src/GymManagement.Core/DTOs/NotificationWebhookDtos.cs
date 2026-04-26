namespace GymManagement.Core.DTOs
{
    public static class NotificationWebhookEventTypes
    {
        public const string PaymentReceipt = "payment_receipt";
        public const string MembershipExpiring = "membership_expiring";
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
}
