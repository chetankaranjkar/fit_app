using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class MemberPTPackage : BaseEntity
    {
        public int UserId { get; set; }
        public int TrainerId { get; set; }
        public int PackageId { get; set; }

        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        public int? PTPackageInvoiceId { get; set; }

        public int TotalSessions { get; set; }
        public int RemainingSessions { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public DateTime? FrozenUntil { get; set; }

        public MemberPTPackageStatus Status { get; set; } = MemberPTPackageStatus.PendingPayment;

        [Column(TypeName = "decimal(12,2)")]
        public decimal Subtotal { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TaxAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal DiscountAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal PaidAmount { get; set; }

        public PTPaymentStatus PaymentStatus { get; set; } = PTPaymentStatus.Pending;

        [MaxLength(50)]
        public string? CouponCode { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal CouponDiscountAmount { get; set; }

        public int? UpgradedFromMemberPackageId { get; set; }

        public int? OrganizationId { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public User User { get; set; } = null!;
        public Trainer Trainer { get; set; } = null!;
        public PTPackage Package { get; set; } = null!;
        public PTPackageInvoice? PackageInvoice { get; set; }
        public MemberPTPackage? UpgradedFrom { get; set; }
        public ICollection<PTSession> Sessions { get; set; } = new List<PTSession>();
        public ICollection<MemberPTPackageHistory> History { get; set; } = new List<MemberPTPackageHistory>();
    }
}
