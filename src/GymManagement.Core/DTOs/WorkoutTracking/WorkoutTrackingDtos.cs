namespace GymManagement.Core.DTOs.WorkoutTracking;

public sealed class StartWorkoutRequestDto
{
    public int MemberId { get; set; }
    public int? WorkoutPlanId { get; set; }
    /// <summary>Client UTC offset in minutes for today's plan day filter.</summary>
    public int? UtcOffsetMinutes { get; set; }
}

public sealed class LogWorkoutSetRequestDto
{
    public long WorkoutSessionExerciseId { get; set; }
    public int? ActualReps { get; set; }
    public decimal? ActualWeight { get; set; }
    public int? DurationSeconds { get; set; }
    public int? RestSeconds { get; set; }
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }
}

public sealed class WorkoutSessionExerciseDto
{
    public long Id { get; set; }
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;
    public int SetNumber { get; set; }
    public int TargetReps { get; set; }
    public int? ActualReps { get; set; }
    public decimal? TargetWeight { get; set; }
    public decimal? ActualWeight { get; set; }
    public int? DurationSeconds { get; set; }
    public int? RestSeconds { get; set; }
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }
    public decimal? SetVolume { get; set; }
}

public sealed class WorkoutSessionGroupDto
{
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;
    public IReadOnlyList<WorkoutSessionExerciseDto> Sets { get; set; } = Array.Empty<WorkoutSessionExerciseDto>();
}

public sealed class ActiveWorkoutSessionDto
{
    public int SessionId { get; set; }
    public int MemberId { get; set; }
    public int? WorkoutPlanId { get; set; }
    public string? PlanName { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? WorkoutDate { get; set; }
    public DateTime? StartTimeUtc { get; set; }
    public decimal CompletionPercent { get; set; }
    public int CompletedSets { get; set; }
    public int TotalSets { get; set; }
    public decimal TotalVolume { get; set; }
    public IReadOnlyList<WorkoutSessionGroupDto> Exercises { get; set; } = Array.Empty<WorkoutSessionGroupDto>();
}

public sealed class WorkoutExerciseHistoryEntryDto
{
    public int SessionId { get; set; }
    public DateTime WorkoutDateUtc { get; set; }
    public int SetNumber { get; set; }
    public decimal? Weight { get; set; }
    public int? Reps { get; set; }
    public decimal Volume { get; set; }
    public bool IsPersonalRecord { get; set; }
    public bool IsImprovement { get; set; }
}

public sealed class WorkoutExerciseHistoryDto
{
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;
    public decimal? BestWeight { get; set; }
    public int? BestReps { get; set; }
    public decimal? BestVolume { get; set; }
    public IReadOnlyList<WorkoutExerciseHistoryEntryDto> Entries { get; set; } = Array.Empty<WorkoutExerciseHistoryEntryDto>();
}

public sealed class WorkoutDashboardDto
{
    public int MemberId { get; set; }
    public int CurrentStreakDays { get; set; }
    public int TotalWorkouts { get; set; }
    public int WorkoutsThisWeek { get; set; }
    public DateTime? LastWorkoutDateUtc { get; set; }
    public decimal AverageCompletionPercent { get; set; }
    public ActiveWorkoutSessionDto? ActiveSession { get; set; }
}

public sealed class MemberWorkoutSummaryDto
{
    public int SessionId { get; set; }
    public int MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string? PlanName { get; set; }
    public DateTime SessionDateUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? CompletionPercent { get; set; }
    public decimal? TotalVolume { get; set; }
}
