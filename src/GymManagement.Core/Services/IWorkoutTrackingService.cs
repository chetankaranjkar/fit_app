using GymManagement.Core.DTOs.WorkoutTracking;

namespace GymManagement.Core.Services;

public interface IWorkoutTrackingService
{
    Task<ActiveWorkoutSessionDto> StartAsync(StartWorkoutRequestDto dto, int? callerUserId, CancellationToken ct = default);
    Task<ActiveWorkoutActiveResponseDto?> GetActiveAsync(int memberId, int? callerUserId, CancellationToken ct = default);
    Task<MemberWorkoutTimelineDto> GetMemberTimelineForTrainerAsync(int trainerUserId, int memberId, int take = 40, CancellationToken ct = default);
    Task<WorkoutSessionDetailDto> GetSessionDetailAsync(int sessionId, int? callerUserId, CancellationToken ct = default);
    Task<WorkoutAdminMonitoringDto> GetAdminMonitoringAsync(int take = 50, CancellationToken ct = default);
    Task<WorkoutSessionExerciseDto> LogSetAsync(LogWorkoutSetRequestDto dto, int? callerUserId, CancellationToken ct = default);
    Task<ActiveWorkoutSessionDto> CompleteAsync(int sessionId, int? callerUserId, decimal? caloriesBurned, CancellationToken ct = default);
    Task<WorkoutExerciseHistoryDto> GetExerciseHistoryAsync(int memberId, int exerciseId, int? callerUserId, int take = 50, CancellationToken ct = default);
    Task<WorkoutDashboardDto> GetDashboardAsync(int memberId, int? callerUserId, CancellationToken ct = default);
    Task<IReadOnlyList<MemberWorkoutSummaryDto>> GetMemberSummariesForTrainerAsync(int trainerUserId, int take = 30, CancellationToken ct = default);
    Task<int?> ResolveMemberIdForUserAsync(int userId, CancellationToken ct = default);
}
