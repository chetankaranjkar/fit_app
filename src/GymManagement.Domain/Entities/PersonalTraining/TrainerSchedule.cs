namespace GymManagement.Domain.Entities.PersonalTraining
{
    /// <summary>Weekly recurring availability for a trainer.</summary>
    public class TrainerSchedule : BaseEntity
    {
        public int TrainerId { get; set; }

        /// <summary>0 = Sunday … 6 = Saturday.</summary>
        public int DayOfWeek { get; set; }

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public TimeSpan? BreakStart { get; set; }
        public TimeSpan? BreakEnd { get; set; }

        public int SessionDurationMinutes { get; set; } = 60;
        public int MaxSessionsPerDay { get; set; } = 8;
        public bool IsActive { get; set; } = true;

        public Trainer Trainer { get; set; } = null!;
    }
}
