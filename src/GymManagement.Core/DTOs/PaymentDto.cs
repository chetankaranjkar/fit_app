using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class PaymentDto
    {
        public int Id { get; set; }
        public int MembershipId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public PaymentMode PaymentMode { get; set; }
        public string? ReceiptNo { get; set; }
        /// <summary>Invoice/receipt generated for this payment, if any.</summary>
        public int? InvoiceId { get; set; }
    }

    public class CreatePaymentDto
    {
        public int MembershipId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public PaymentMode PaymentMode { get; set; }
        public string? ReceiptNo { get; set; }
    }

    public class UpdatePaymentDto
    {
        public decimal? Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PaymentMode? PaymentMode { get; set; }
        public string? ReceiptNo { get; set; }
    }
}
