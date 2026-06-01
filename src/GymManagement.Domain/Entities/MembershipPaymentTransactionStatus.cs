namespace GymManagement.Domain.Entities
{
    /// <summary>Settlement state for an installment line (membership_payment_transactions).</summary>
    public enum MembershipPaymentTransactionStatus
    {
        Completed,
        Voided,
        Refunded,
    }
}
