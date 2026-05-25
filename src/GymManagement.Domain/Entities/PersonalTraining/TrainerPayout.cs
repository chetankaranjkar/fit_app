using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class TrainerPayout : BaseEntity
    {
        public int TrainerId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal TotalAmount { get; set; }

        public TrainerPayoutStatus Status { get; set; } = TrainerPayoutStatus.Pending;
        public DateTime? PaidDate { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public Trainer Trainer { get; set; } = null!;
        public ICollection<TrainerCommission> Commissions { get; set; } = new List<TrainerCommission>();
    }
}
