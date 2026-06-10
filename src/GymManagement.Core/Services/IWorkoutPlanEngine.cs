using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services;

public sealed class WorkoutPlanScheduleContext
{
    public WorkoutPlan Plan { get; init; } = null!;
    public IReadOnlyList<WorkoutPlanWeek> Weeks { get; init; } = Array.Empty<WorkoutPlanWeek>();
    public IReadOnlyList<WorkoutPlanDay> Days { get; init; } = Array.Empty<WorkoutPlanDay>();
    public IReadOnlyList<WorkoutPlanExercise> Exercises { get; init; } = Array.Empty<WorkoutPlanExercise>();
    public DateTime ProgramStartDate { get; init; }
    public DateTime AsOfUtc { get; init; } = DateTime.UtcNow;
    public int UtcOffsetMinutes { get; init; }
}

public sealed class ResolvedWorkoutDay
{
    public int CurrentProgramDay { get; init; }
    public int CurrentProgramWeek { get; init; }
    public int ResolvedTemplateWeekNumber { get; init; }
    public WorkoutPlanDay? PlanDay { get; init; }
    public bool IsRestDay { get; init; }
    public IReadOnlyList<WorkoutPlanExercise> Exercises { get; init; } = Array.Empty<WorkoutPlanExercise>();
    public string TemplateMode { get; init; } = WorkoutPlanTemplateModes.Legacy;
    public int EstimatedDurationMinutes { get; init; }
}

public interface IWorkoutPlanEngine
{
    ResolvedWorkoutDay ResolveToday(WorkoutPlanScheduleContext context);
    int ResolveTemplateWeekNumber(WorkoutPlan plan, int programWeek);
    int CalculateProgramDay(WorkoutPlan plan, DateTime programStartDate, DateTime asOfUtc, int utcOffsetMinutes);
    int CalculateProgramWeek(int programDay);
}
