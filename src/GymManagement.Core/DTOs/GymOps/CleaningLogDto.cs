namespace GymManagement.Core.DTOs.GymOps
{
    public class CleaningTaskItemDto
    {
        public int Id { get; set; }
        public string Label { get; set; } = string.Empty;
        public bool IsDone { get; set; }
    }

    public class CleaningLogDto
    {
        public int Id { get; set; }
        public DateTime LogDate { get; set; }
        public string Area { get; set; } = string.Empty;
        public string Shift { get; set; } = string.Empty;
        public string? PerformedBy { get; set; }
        public string? Notes { get; set; }
        public List<CleaningTaskItemDto> Tasks { get; set; } = new();
    }

    public class CreateCleaningTaskItemDto
    {
        public string Label { get; set; } = string.Empty;
        public bool IsDone { get; set; }
    }

    public class CreateCleaningLogDto
    {
        public DateTime LogDate { get; set; }
        public string Area { get; set; } = string.Empty;
        public string Shift { get; set; } = string.Empty;
        public string? PerformedBy { get; set; }
        public string? Notes { get; set; }
        public List<CreateCleaningTaskItemDto> Tasks { get; set; } = new();
    }

    public class UpdateCleaningTaskDto
    {
        public bool IsDone { get; set; }
    }
}
