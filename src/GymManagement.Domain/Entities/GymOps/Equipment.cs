namespace GymManagement.Domain.Entities.GymOps
{
    /// <summary>
    /// Gym Operations module — physical asset on the gym floor (machine, rack, accessory).
    /// Kept in its own namespace to stay isolated from core domain entities.
    /// </summary>
    public class Equipment : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // Cardio / Strength / Functional / Accessory
        public string? Brand { get; set; }
        public string? SerialNumber { get; set; }
        public string Location { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public decimal PurchaseCost { get; set; }
        public string Status { get; set; } = "OPERATIONAL"; // OPERATIONAL / UNDER_MAINTENANCE / OUT_OF_ORDER / RETIRED
        public DateTime? NextServiceDate { get; set; }
        public string? Notes { get; set; }

        public ICollection<MaintenanceLog> MaintenanceLogs { get; set; } = new List<MaintenanceLog>();
    }
}
