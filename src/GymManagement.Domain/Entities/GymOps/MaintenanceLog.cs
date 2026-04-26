namespace GymManagement.Domain.Entities.GymOps
{
    public class MaintenanceLog : BaseEntity
    {
        public int EquipmentId { get; set; }
        public string Type { get; set; } = "ROUTINE"; // ROUTINE / REPAIR / INSPECTION
        public DateTime PerformedAt { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime? NextServiceDate { get; set; }

        public Equipment? Equipment { get; set; }
    }
}
