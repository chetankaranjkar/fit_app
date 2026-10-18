namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Allowed values are stored in membership_status table and enforced in application code.
    /// Membership records are never physically deleted; terminal states include Voided and Cancelled.
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
        /// <summary>Void requested; awaiting admin approval.</summary>
        VoidPending,
        /// <summary>Admin-approved void; record retained permanently.</summary>
        Voided,
        /// <summary>Membership transferred to another member/plan context.</summary>
        Transferred,
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

        /// <summary>Branch that sold this membership. Historical; not rewritten when the member transfers.</summary>
        public int? SellingBranchId { get; set; }
        /// <summary>Price agreed at sale. Null on rows created before branch pricing.</summary>
        public decimal? AgreedPrice { get; set; }
        /// <summary>HomeOnly, Selected, or AllOrganization. Null on legacy rows until an administrator sets access.</summary>
        public string? AccessScope { get; set; }

        public User User { get; set; } = null!;
        public Branch? SellingBranch { get; set; }
        public ICollection<UserMembershipAccessBranch> AccessBranches { get; set; } = new List<UserMembershipAccessBranch>();
        public MembershipPlan Plan { get; set; } = null!;
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public ICollection<MembershipPayment> MembershipPayments { get; set; } = new List<MembershipPayment>();
    }
}
