using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Scheduling;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed class MemberTrainingScheduleService : IMemberTrainingScheduleService
    {
        private readonly ApplicationDbContext _db;

        public MemberTrainingScheduleService(ApplicationDbContext db) => _db = db;

        public async Task<IReadOnlyList<TrainingScheduleConflictDto>> GetConflictsAsync(
            ValidateMemberTrainingScheduleDto input,
            CancellationToken cancellationToken = default)
        {
            if (input.TrainerId <= 0)
                return Array.Empty<TrainingScheduleConflictDto>();

            if (!MemberTrainingScheduleRules.TryResolveSchedule(
                    input.TrainingScheduleType,
                    input.PreferredGymTime,
                    input.TrainingStartTime,
                    input.TrainingEndTime,
                    input.TrainingDaysOfWeek,
                    out var candidateStart,
                    out var candidateEnd,
                    out var candidateDays))
            {
                return Array.Empty<TrainingScheduleConflictDto>();
            }

            var assignedUserIds = await _db.UserInstructors.AsNoTracking()
                .Where(a =>
                    a.TrainerId == input.TrainerId
                    && a.IsActive
                    && !a.EndDate.HasValue
                    && (!input.UserId.HasValue || a.UserId != input.UserId.Value))
                .Select(a => a.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (assignedUserIds.Count == 0)
                return Array.Empty<TrainingScheduleConflictDto>();

            var users = await _db.Users.AsNoTracking()
                .Where(u => assignedUserIds.Contains(u.Id) && !u.IsDeleted)
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.PreferredGymTime,
                    u.TrainingScheduleType,
                    u.TrainingStartTime,
                    u.TrainingEndTime,
                    u.TrainingDaysOfWeek,
                })
                .ToListAsync(cancellationToken);

            var conflicts = new List<TrainingScheduleConflictDto>();
            foreach (var other in users)
            {
                if (!MemberTrainingScheduleRules.TryResolveSchedule(
                        other.TrainingScheduleType,
                        other.PreferredGymTime,
                        other.TrainingStartTime,
                        other.TrainingEndTime,
                        other.TrainingDaysOfWeek,
                        out var otherStart,
                        out var otherEnd,
                        out var otherDays))
                {
                    continue;
                }

                var sharedDays = candidateDays.Intersect(otherDays).ToHashSet();
                if (sharedDays.Count == 0)
                    continue;

                if (!MemberTrainingScheduleRules.TimesOverlap(candidateStart, candidateEnd, otherStart, otherEnd))
                    continue;

                var overlapStart = candidateStart > otherStart ? candidateStart : otherStart;
                var overlapEnd = candidateEnd < otherEnd ? candidateEnd : otherEnd;

                conflicts.Add(new TrainingScheduleConflictDto
                {
                    UserId = other.Id,
                    MemberName = $"{other.FirstName} {other.LastName}".Trim(),
                    ScheduleLabel = MemberTrainingScheduleRules.FormatScheduleLabel(
                        other.TrainingScheduleType,
                        other.PreferredGymTime,
                        other.TrainingStartTime,
                        other.TrainingEndTime,
                        other.TrainingDaysOfWeek),
                    OverlapDays = MemberTrainingScheduleRules.FormatDays(sharedDays),
                    OverlapTime =
                        $"{MemberTrainingScheduleRules.FormatTime(overlapStart)} – {MemberTrainingScheduleRules.FormatTime(overlapEnd)}",
                });
            }

            return conflicts;
        }

        public async Task EnsureNoConflictsOrThrowAsync(
            ValidateMemberTrainingScheduleDto input,
            bool allowOverride,
            CancellationToken cancellationToken = default)
        {
            if (allowOverride)
                return;

            var conflicts = await GetConflictsAsync(input, cancellationToken);
            if (conflicts.Count == 0)
                return;

            var names = string.Join(", ", conflicts.Select(c => c.MemberName));
            throw new ConflictException(
                $"Training time conflicts with other members assigned to this coach: {names}. Adjust the slot or enable admin override.");
        }
    }
}
