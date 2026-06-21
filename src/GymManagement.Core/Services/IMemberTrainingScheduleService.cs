using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IMemberTrainingScheduleService
    {
        Task<IReadOnlyList<TrainingScheduleConflictDto>> GetConflictsAsync(
            ValidateMemberTrainingScheduleDto input,
            CancellationToken cancellationToken = default);

        Task EnsureNoConflictsOrThrowAsync(
            ValidateMemberTrainingScheduleDto input,
            bool allowOverride,
            CancellationToken cancellationToken = default);
    }
}
