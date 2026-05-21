namespace GymManagement.Domain.Entities
{
    /// <summary>High-level settlement state for a membership billing record (membership_payments).</summary>
    public enum MembershipPaymentStatus
    {
        Pending,
        Partial,
        Paid,
        Overdue,
    }

    /// <summary>How money was received for a transaction or last header touch.</summary>
    public enum MembershipPaymentMethod
    {
        Cash,
        Upi,
        Card,
        BankTransfer,
        Online,
        Other,
    }
}
