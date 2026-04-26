namespace GymManagement.Domain.Entities.GymOps
{
    public class CleaningLog : BaseEntity
    {
        public DateTime LogDate { get; set; }
        public string Area { get; set; } = string.Empty; // Weights / Cardio / Locker Rooms / Reception / Restrooms
        public string Shift { get; set; } = string.Empty; // Morning / Afternoon / Evening
        public string? PerformedBy { get; set; }
        public string? Notes { get; set; }

        public ICollection<CleaningTaskItem> Tasks { get; set; } = new List<CleaningTaskItem>();
    }
}
