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
        /// <summary>Branch where this work happened. Not updated when the asset is transferred later.</summary>
        public int? BranchId { get; set; }

        public Equipment? Equipment { get; set; }
    }
}
