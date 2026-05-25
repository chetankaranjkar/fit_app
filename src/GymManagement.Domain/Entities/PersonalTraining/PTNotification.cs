using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class PTNotification : BaseEntity
    {
        public int? UserId { get; set; }
        public int? TrainerId { get; set; }
        public int? PTSessionId { get; set; }
        public int? MemberPTPackageId { get; set; }

        public PTNotificationType NotificationType { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Body { get; set; }

        public bool IsRead { get; set; }
        public DateTime? ScheduledForUtc { get; set; }
        public DateTime? SentAtUtc { get; set; }

        /// <summary>SMS/email channel placeholder (e.g. SMS, Email, InApp).</summary>
        [MaxLength(30)]
        public string Channel { get; set; } = "InApp";
    }
}
