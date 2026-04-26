namespace GymManagement.Domain.Entities
{
    public enum PaymentMode
    {
        Cash,
        Upi,
        Card
    }

    public class Payment : BaseEntity
    {
        public int MembershipId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public PaymentMode PaymentMode { get; set; }
        public string? ReceiptNo { get; set; }
        public int? OrganizationId { get; set; }

        public UserMembership Membership { get; set; } = null!;
        public Organization? Organization { get; set; }
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}
