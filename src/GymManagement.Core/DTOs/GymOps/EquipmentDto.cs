namespace GymManagement.Core.DTOs.GymOps
{
    public class EquipmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Brand { get; set; }
        public string? SerialNumber { get; set; }
        public string Location { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public decimal PurchaseCost { get; set; }
        public string Status { get; set; } = "OPERATIONAL";
        public DateTime? NextServiceDate { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateEquipmentDto
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Brand { get; set; }
        public string? SerialNumber { get; set; }
        public string Location { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public decimal PurchaseCost { get; set; }
        public string Status { get; set; } = "OPERATIONAL";
        public DateTime? NextServiceDate { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateEquipmentDto
    {
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Brand { get; set; }
        public string? SerialNumber { get; set; }
        public string? Location { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public decimal? PurchaseCost { get; set; }
        public string? Status { get; set; }
        public DateTime? NextServiceDate { get; set; }
        public string? Notes { get; set; }
    }
}
