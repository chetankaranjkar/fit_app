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
        public int? BranchId { get; set; }
    }

    public class CreateAttendanceLogDto
    {
        public int UserId { get; set; }
        public DateTime? CheckInTime { get; set; }
        public string? CheckInMethod { get; set; }
        public string? Notes { get; set; }
        public int? BranchId { get; set; }
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
        public int? BranchId { get; set; }
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

    /// <summary>
    /// Counts for a date range. Completed sessions are visits in that range with a check-out.
    /// Session completion rate is <see cref="CompletedSessions"/> / <see cref="TotalVisits"/>.
    /// </summary>
    public class AttendanceRangeSummaryDto
    {
        public int TotalVisits { get; set; }
        public int ActiveVisits { get; set; }
        public int CompletedSessions { get; set; }
        public int UniqueMembers { get; set; }

        public static int SessionCompletionPercent(int completedSessions, int totalVisits) =>
            totalVisits <= 0 ? 0 : (int)Math.Round(completedSessions * 100d / totalVisits, MidpointRounding.AwayFromZero);

        public static AttendanceRangeSummaryDto FromCounts(int totalVisits, int activeVisits, int uniqueMembers) =>
            new()
            {
                TotalVisits = totalVisits,
                ActiveVisits = activeVisits,
                CompletedSessions = totalVisits - activeVisits,
                UniqueMembers = uniqueMembers,
            };
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

