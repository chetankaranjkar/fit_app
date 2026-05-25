using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class TrainerCommission : BaseEntity
    {
        public int TrainerId { get; set; }
        public int? PTSessionId { get; set; }
        public int? MemberPTPackageId { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal Amount { get; set; }

        public TrainerCommissionType CommissionType { get; set; }
        public TrainerCommissionStatus Status { get; set; } = TrainerCommissionStatus.Pending;

        public DateTime EarnedDate { get; set; } = DateTime.UtcNow;
        public DateTime? PaidDate { get; set; }
        public int? PayoutId { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal? BaseAmount { get; set; }

        public Trainer Trainer { get; set; } = null!;
        public PTSession? PTSession { get; set; }
        public MemberPTPackage? MemberPTPackage { get; set; }
        public TrainerPayout? Payout { get; set; }
    }
}
