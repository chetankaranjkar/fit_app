using GymManagement.Core.DTOs.WorkoutTracking;

namespace GymManagement.Core.Services;

public interface IWorkoutTrackingService
{
    Task<ActiveWorkoutSessionDto> StartAsync(StartWorkoutRequestDto dto, int? callerUserId, CancellationToken ct = default);
    Task<ActiveWorkoutActiveResponseDto?> GetActiveAsync(int memberId, int? callerUserId, CancellationToken ct = default);
    Task<TodayWorkoutStateDto> GetTodayAsync(int memberId, int? workoutPlanId, int? utcOffsetMinutes, int? callerUserId, CancellationToken ct = default);
    Task<MemberWorkoutTimelineDto> GetMemberTimelineForTrainerAsync(int trainerUserId, int memberId, int take = 40, CancellationToken ct = default);
    Task<WorkoutSessionDetailDto> GetSessionDetailAsync(int sessionId, int? callerUserId, bool callerHasFullUsersAccess = false, CancellationToken ct = default);
    /// <summary>Paged server-synced history for a profile <c>Users.Id</c>. Does not accept a Members.Id.</summary>
    Task<MemberWorkoutHistoryPageDto> GetMemberWorkoutHistoryAsync(int userId, MemberWorkoutHistoryQueryDto query, int? callerUserId, bool callerHasFullUsersAccess, CancellationToken ct = default);
    Task<WorkoutAdminMonitoringDto> GetAdminMonitoringAsync(int take = 50, CancellationToken ct = default);
    Task<WorkoutSessionExerciseDto> LogSetAsync(LogWorkoutSetRequestDto dto, int? callerUserId, CancellationToken ct = default);
    Task<ActiveWorkoutSessionDto> CompleteAsync(int sessionId, int? callerUserId, decimal? caloriesBurned, CancellationToken ct = default);
    Task<WorkoutExerciseHistoryDto> GetExerciseHistoryAsync(int memberId, int exerciseId, int? callerUserId, int take = 50, CancellationToken ct = default);
    Task<WorkoutDashboardDto> GetDashboardAsync(int memberId, int? callerUserId, CancellationToken ct = default);
    Task<IReadOnlyList<MemberWorkoutSummaryDto>> GetMemberSummariesForTrainerAsync(int trainerUserId, int take = 30, CancellationToken ct = default);
    Task<int?> ResolveMemberIdForUserAsync(int userId, CancellationToken ct = default);
}
