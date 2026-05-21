namespace GymManagement.Domain.Entities
{
    /// <summary>Immutable audit line for each installment toward a <see cref="MembershipPayment"/>.</summary>
    public class MembershipPaymentTransaction : BaseEntity
    {
        public int PaymentId { get; set; }

        public decimal TransactionAmount { get; set; }

        public MembershipPaymentMethod TransactionMethod { get; set; }

        public string? ReferenceNumber { get; set; }

        public DateTime TransactionDate { get; set; }

        public string? Remarks { get; set; }

        /// <summary>Staff profile <see cref="User.Id"/> who collected (optional).</summary>
        public int? CollectedByUserId { get; set; }

        public MembershipPayment Payment { get; set; } = null!;
    }
}
