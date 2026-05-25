using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class PTSessionHistory : BaseEntity
    {
        public int PTSessionId { get; set; }
        public PTSessionStatus FromStatus { get; set; }
        public PTSessionStatus ToStatus { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public int? PerformedByUserId { get; set; }

        public PTSession PTSession { get; set; } = null!;
    }
}
