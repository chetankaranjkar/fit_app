using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs
{
    public class UserScheduleDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int? TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public int WorkoutPlanId { get; set; }
        public string WorkoutPlanName { get; set; } = string.Empty;
        public ScheduleType ScheduleType { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public bool IsActive { get; set; }
        public DateTime AssignedAt { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
    }

    public class CreateUserScheduleDto
    {
        public int UserId { get; set; }
        public int? TrainerId { get; set; }
        public int WorkoutPlanId { get; set; }
        public ScheduleType ScheduleType { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }

    public class GenerateDefaultScheduleDto
    {
        public int UserId { get; set; }
        public ScheduleType ScheduleType { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int? TrainerId { get; set; }
    }

    public class AssignWorkoutPlanDto
    {
        public int UserId { get; set; }
        public int? TrainerId { get; set; }
        public int WorkoutPlanId { get; set; }
        public ScheduleType ScheduleType { get; set; } = ScheduleType.Custom;
        public DayOfWeek DayOfWeek { get; set; } = DayOfWeek.Monday;
        public TimeSpan StartTime { get; set; } = new TimeSpan(6, 0, 0);
        public TimeSpan EndTime { get; set; } = new TimeSpan(7, 0, 0);
        public bool DeactivateExistingAssignments { get; set; } = true;
    }
}

