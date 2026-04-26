namespace GymManagement.Core.DTOs.GymOps
{
    public class MaintenanceLogDto
    {
        public int Id { get; set; }
        public int EquipmentId { get; set; }
        public string? EquipmentName { get; set; }
        public string Type { get; set; } = "ROUTINE";
        public DateTime PerformedAt { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? NextServiceDate { get; set; }
    }

    public class CreateMaintenanceLogDto
    {
        public int EquipmentId { get; set; }
        public string Type { get; set; } = "ROUTINE";
        public DateTime PerformedAt { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? NextServiceDate { get; set; }
    }
}
