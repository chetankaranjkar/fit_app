using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services;

public interface IWorkoutPlanAuditService
{
    Task LogAsync(
        WorkoutPlanAuditAction action,
        int? workoutPlanId,
        string workoutPlanName,
        int? assignedToUserId,
        int performedByUserId,
        string performedByUserName,
        string? changeDetails = null,
        string? snapshotJson = null,
        CancellationToken ct = default);

    Task<IReadOnlyList<WorkoutPlanAuditLogDto>> ListAsync(
        WorkoutPlanAuditListQuery query,
        CancellationToken ct = default);

    /// <summary>
    /// Personal plans only: snapshot → audit row → soft-delete children → soft-delete plan (single transaction).
    /// </summary>
    Task<bool> DeletePersonalWorkoutPlanWithAuditAsync(
        int workoutPlanId,
        int performedByUserId,
        string performedByUserName,
        CancellationToken ct = default);
}
