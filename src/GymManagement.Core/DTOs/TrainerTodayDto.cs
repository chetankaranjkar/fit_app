namespace GymManagement.Core.DTOs
{
    /// <summary>
    /// Caller-scoped trainer "today" view. Recorded data (attendance logs, PT attendance) and
    /// schedule-inferred states are kept in separate fields; inferred states are never persisted.
    /// </summary>
    public class TrainerTodayDto
    {
        public int TrainerId { get; set; }
        /// <summary>Local calendar date (yyyy-MM-dd) the view was computed for.</summary>
        public string LocalDate { get; set; } = string.Empty;
        public DateTime GeneratedAtUtc { get; set; }
        public int MissedLookbackDays { get; set; }

        public int ActiveClients { get; set; }
        /// <summary><c>Trainer.MaxActiveClients</c>; null when the gym default applies.</summary>
        public int? ConfiguredMaxActiveClients { get; set; }
        public int EffectiveCapacity { get; set; }
        public int ClientsWithoutSchedule { get; set; }

        public IReadOnlyList<TrainerTodayClientDto> ExpectedToday { get; set; } = Array.Empty<TrainerTodayClientDto>();
        public IReadOnlyList<TrainerTodayPtSessionDto> PtSessionsToday { get; set; } = Array.Empty<TrainerTodayPtSessionDto>();
        public IReadOnlyList<TrainerInferredMissDto> RecentInferredMisses { get; set; } = Array.Empty<TrainerInferredMissDto>();
        public IReadOnlyList<TrainerTodayPtSessionDto> RecentPtNoShows { get; set; } = Array.Empty<TrainerTodayPtSessionDto>();
    }

    public class TrainerTodayClientDto
    {
        public int UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string? ScheduleLabel { get; set; }
        /// <summary>HH:mm local.</summary>
        public string WindowStart { get; set; } = string.Empty;
        public string WindowEnd { get; set; } = string.Empty;
        /// <summary><c>CheckedIn</c> (recorded) | <c>AwaitingCheckIn</c> / <c>MissedInferred</c> (inferred).</summary>
        public string State { get; set; } = string.Empty;
        public DateTime? CheckInTimeUtc { get; set; }
        public string? CheckInMethod { get; set; }
    }

    public class TrainerTodayPtSessionDto
    {
        public int SessionId { get; set; }
        public int UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public DateTime ScheduledStartUtc { get; set; }
        public DateTime ScheduledEndUtc { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool AttendanceRecorded { get; set; }
        public bool? MemberPresent { get; set; }
        public bool? IsNoShow { get; set; }
        public bool? IsLate { get; set; }
    }

    public class TrainerInferredMissDto
    {
        public int UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        /// <summary>yyyy-MM-dd local.</summary>
        public string LocalDate { get; set; } = string.Empty;
        public string? ScheduleLabel { get; set; }
    }
}
