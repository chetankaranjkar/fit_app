namespace GymManagement.Domain.Entities
{
    public class UserSchedule : BaseEntity
    {
        public int UserId { get; set; }
        public int? TrainerId { get; set; }
        public int WorkoutPlanId { get; set; }
        public ScheduleType ScheduleType { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation properties
        public User User { get; set; } = null!;
        public Trainer? Trainer { get; set; }
        public WorkoutPlan WorkoutPlan { get; set; } = null!;
    }
}
