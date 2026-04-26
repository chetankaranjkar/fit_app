namespace GymManagement.Core.DTOs
{
    public class DashboardStatisticsDto
    {
        public int TotalUsers { get; set; }
        public int TotalTrainers { get; set; }
        public List<TrainerUserCountDto> TrainersWithUserCount { get; set; } = new List<TrainerUserCountDto>();
    }

    public class DashboardNotificationsDto
    {
        public List<DashboardAlertDto> Alerts { get; set; } = new List<DashboardAlertDto>();
        public NotificationHookStatusDto Hooks { get; set; } = new NotificationHookStatusDto();
    }

    public class DashboardAlertDto
    {
        public string Type { get; set; } = string.Empty;
        public string Severity { get; set; } = "info";
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class NotificationHookStatusDto
    {
        public bool EmailEnabled { get; set; }
        public bool WhatsAppEnabled { get; set; }
    }

    public class TrainerUserCountDto
    {
        public int TrainerId { get; set; }
        public string TrainerName { get; set; } = string.Empty;
        public string TrainerEmail { get; set; } = string.Empty;
        public int UserCount { get; set; }
    }
}

