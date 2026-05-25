using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class PTSession : BaseEntity
    {
        public int MemberPTPackageId { get; set; }
        public int UserId { get; set; }
        public int TrainerId { get; set; }

        public DateTime ScheduledStartUtc { get; set; }
        public DateTime ScheduledEndUtc { get; set; }

        public PTSessionStatus Status { get; set; } = PTSessionStatus.Booked;

        public int? RescheduledFromSessionId { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public int? OrganizationId { get; set; }

        public MemberPTPackage MemberPTPackage { get; set; } = null!;
        public User User { get; set; } = null!;
        public Trainer Trainer { get; set; } = null!;
        public PTSession? RescheduledFrom { get; set; }
        public PTAttendance? Attendance { get; set; }
        public ICollection<PTSessionHistory> History { get; set; } = new List<PTSessionHistory>();
    }
}
