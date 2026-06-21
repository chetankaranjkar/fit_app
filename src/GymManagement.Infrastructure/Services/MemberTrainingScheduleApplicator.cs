using GymManagement.Core.Scheduling;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    internal static class MemberTrainingScheduleApplicator
    {
        public static void Apply(
            User user,
            string? scheduleType,
            string? preferredGymTime,
            TimeSpan? trainingStartTime,
            TimeSpan? trainingEndTime,
            string? trainingDaysOfWeek)
        {
            var type = string.IsNullOrWhiteSpace(scheduleType)
                ? MemberTrainingScheduleRules.Batch
                : scheduleType.Trim();

            if (string.Equals(type, MemberTrainingScheduleRules.Custom, StringComparison.OrdinalIgnoreCase))
            {
                if (!trainingStartTime.HasValue || !trainingEndTime.HasValue || trainingEndTime <= trainingStartTime)
                    throw new ArgumentException("Custom training slot requires a valid start and end time.");

                user.TrainingScheduleType = MemberTrainingScheduleRules.Custom;
                user.PreferredGymTime = null;
                user.TrainingStartTime = trainingStartTime;
                user.TrainingEndTime = trainingEndTime;
                user.TrainingDaysOfWeek = string.IsNullOrWhiteSpace(trainingDaysOfWeek)
                    ? "1,2,3,4,5"
                    : trainingDaysOfWeek.Trim();
                return;
            }

            user.TrainingScheduleType = MemberTrainingScheduleRules.Batch;
            user.PreferredGymTime = string.IsNullOrWhiteSpace(preferredGymTime) ? null : preferredGymTime.Trim();
            user.TrainingStartTime = null;
            user.TrainingEndTime = null;
            user.TrainingDaysOfWeek = null;
        }

        public static void CopyToMember(Member member, User user)
        {
            member.PreferredGymTime = user.PreferredGymTime;
            member.TrainingScheduleType = user.TrainingScheduleType;
            member.TrainingStartTime = user.TrainingStartTime;
            member.TrainingEndTime = user.TrainingEndTime;
            member.TrainingDaysOfWeek = user.TrainingDaysOfWeek;
        }
    }
}
