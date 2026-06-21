namespace GymManagement.Core.DTOs
{
    public class TrainingScheduleConflictDto
    {
        public int UserId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string ScheduleLabel { get; set; } = string.Empty;
        public string OverlapDays { get; set; } = string.Empty;
        public string OverlapTime { get; set; } = string.Empty;
    }

    public class ValidateMemberTrainingScheduleDto
    {
        public int TrainerId { get; set; }
        public int? UserId { get; set; }
        public string? TrainingScheduleType { get; set; }
        public string? PreferredGymTime { get; set; }
        public TimeSpan? TrainingStartTime { get; set; }
        public TimeSpan? TrainingEndTime { get; set; }
        public string? TrainingDaysOfWeek { get; set; }
    }
}
