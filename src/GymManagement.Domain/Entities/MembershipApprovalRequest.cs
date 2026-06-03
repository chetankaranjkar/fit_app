using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities
{
    /// <summary>Staff-initiated membership changes requiring admin approval (void, cancel, plan/date/fee edits).</summary>
    public class MembershipApprovalRequest : BaseEntity
    {
        public int MembershipId { get; set; }
        public int MemberId { get; set; }

        public MembershipApprovalRequestType RequestType { get; set; }
        public MembershipApprovalRequestStatus Status { get; set; } = MembershipApprovalRequestStatus.Pending;

        [Required]
        [MaxLength(2000)]
        public string Reason { get; set; } = string.Empty;

        public int RequestedByUserId { get; set; }
        public DateTime RequestedDate { get; set; } = DateTime.UtcNow;

        public int? ApprovedByUserId { get; set; }
        public DateTime? ApprovedDate { get; set; }

        public int? RejectedByUserId { get; set; }
        public DateTime? RejectedDate { get; set; }

        [MaxLength(1000)]
        public string? AdminRemarks { get; set; }

        /// <summary>Membership status before a void request moved it to VoidPending (used on reject).</summary>
        public MembershipStatus? PreviousMembershipStatus { get; set; }

        /// <summary>JSON payload for plan/date/fee/edit/transfer proposals.</summary>
        [MaxLength(4000)]
        public string? ProposedChangesJson { get; set; }

        public UserMembership Membership { get; set; } = null!;
        public User Member { get; set; } = null!;
        public User RequestedBy { get; set; } = null!;
    }
}
