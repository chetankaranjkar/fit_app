using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class TrainerLeave : BaseEntity
    {
        public int TrainerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        public bool IsApproved { get; set; } = true;

        public Trainer Trainer { get; set; } = null!;
    }
}
