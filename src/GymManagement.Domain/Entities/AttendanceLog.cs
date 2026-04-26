namespace GymManagement.Domain.Entities
{
    public class AttendanceLog : BaseEntity
    {
        public int? UserId { get; set; } // Member who attended
        public int? LoggedByUserId { get; set; } // Person who logged this (e.g. staff)
        public DateTime CheckInTime { get; set; } = DateTime.UtcNow;
        public DateTime? CheckOutTime { get; set; }
        public DateTime AttendanceDate { get; set; } = DateTime.UtcNow.Date;
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }
        public string? CheckInMethod { get; set; }
        public string? CheckOutMethod { get; set; }
        public string? ExceptionReason { get; set; }
        public string? CorrectionAuditNote { get; set; }
        public bool IsManualCorrection { get; set; }
        public int? CorrectedByUserId { get; set; }
        public DateTime? CorrectedAt { get; set; }

        public User? User { get; set; }
        public User? LoggedByUser { get; set; }
    }
}

