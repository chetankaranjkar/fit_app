namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Allowed values are stored in membership_status table: Active, Expired, Frozen, Cancelled, Pending.
    /// </summary>
    public enum MembershipStatus
    {
        Active,
        Expired,
        Frozen,
        Cancelled,
        Pending,
        /// <summary>Membership is recognized but full payment has not been received.</summary>
        ActivePendingPayment,
        /// <summary>Part of the membership fee has been paid; balance is outstanding.</summary>
        PartialPayment,
    }

    public class UserMembership : BaseEntity
    {
        public int UserId { get; set; }
        public int PlanId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public MembershipStatus Status { get; set; } = MembershipStatus.Active;

        /// <summary>When the membership was frozen (if Status is Frozen).</summary>
        public DateTime? FreezeStartDate { get; set; }
        /// <summary>When the freeze ends.</summary>
        public DateTime? FreezeEndDate { get; set; }
        /// <summary>Optional reason for freezing.</summary>
        public string? FreezeReason { get; set; }

        public User User { get; set; } = null!;
        public MembershipPlan Plan { get; set; } = null!;
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public ICollection<MembershipPayment> MembershipPayments { get; set; } = new List<MembershipPayment>();
    }
}
