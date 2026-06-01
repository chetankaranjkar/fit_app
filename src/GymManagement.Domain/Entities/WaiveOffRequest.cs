using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities
{
    /// <summary>Admin-approved fee reduction (distinct from marketing coupon discounts).</summary>
    public class WaiveOffRequest : BaseEntity
    {
        public int UserId { get; set; }
        public int MembershipPaymentId { get; set; }

        [Required]
        public decimal RequestedAmount { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Reason { get; set; } = string.Empty;

        public WaiveOffRequestStatus Status { get; set; } = WaiveOffRequestStatus.Pending;

        public int RequestedByUserId { get; set; }
        public DateTime RequestedDate { get; set; } = DateTime.UtcNow;

        public int? ApprovedByUserId { get; set; }
        public DateTime? ApprovedDate { get; set; }

        public int? RejectedByUserId { get; set; }
        public DateTime? RejectedDate { get; set; }

        [MaxLength(1000)]
        public string? RejectionReason { get; set; }

        public User User { get; set; } = null!;
        public MembershipPayment MembershipPayment { get; set; } = null!;
    }
}
