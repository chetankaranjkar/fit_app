namespace GymManagement.Core.DTOs
{
    public class AttendanceLogDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public DateTime AttendanceDate { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Notes { get; set; }
        public string? CheckInMethod { get; set; }
        public string? CheckOutMethod { get; set; }
        public bool IsCheckedIn { get; set; } // True if checked in but not checked out
        public string? ExceptionReason { get; set; }
        public string? CorrectionAuditNote { get; set; }
        public bool IsManualCorrection { get; set; }
        public int? CorrectedByUserId { get; set; }
        public DateTime? CorrectedAt { get; set; }
    }

    public class CreateAttendanceLogDto
    {
        public int UserId { get; set; }
        public DateTime? CheckInTime { get; set; }
        public string? CheckInMethod { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateAttendanceLogDto
    {
        public DateTime? CheckOutTime { get; set; }
        public string? CheckOutMethod { get; set; }
        public string? Notes { get; set; }
        public string? ExceptionReason { get; set; }
    }

    public class CheckInDto
    {
        public int UserId { get; set; }
        /// <summary>User ID of the person logging this check-in (e.g. staff).</summary>
        public int? LoggedByUserId { get; set; }
        public string? CheckInMethod { get; set; }
        public string? Notes { get; set; }
    }

    public class CheckOutDto
    {
        public int AttendanceLogId { get; set; }
        public string? CheckOutMethod { get; set; }
        public string? Notes { get; set; }
    }

    public class AttendanceCorrectionDto
    {
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? ExceptionReason { get; set; }
        public string AuditNote { get; set; } = string.Empty;
    }

    public class BulkAttendanceCorrectionDto
    {
        public List<int> AttendanceLogIds { get; set; } = new();
        public string? ExceptionReason { get; set; }
        public string AuditNote { get; set; } = string.Empty;
    }

    public class AttendanceAnomalyDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public DateTime AttendanceDate { get; set; }
        public string Type { get; set; } = string.Empty; // late | no_show
        public string Message { get; set; } = string.Empty;
        public int? AttendanceLogId { get; set; }
        public int? LateByMinutes { get; set; }
    }
}

