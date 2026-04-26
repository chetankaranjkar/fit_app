namespace GymManagement.Domain.Entities.GymOps
{
    public class CleaningTaskItem : BaseEntity
    {
        public int CleaningLogId { get; set; }
        public string Label { get; set; } = string.Empty;
        public bool IsDone { get; set; }

        public CleaningLog? CleaningLog { get; set; }
    }
}
