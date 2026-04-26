namespace GymManagement.Domain.Entities.GymOps
{
    public class Vendor : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // EQUIPMENT / SUPPLEMENTS / CLEANING / MAINTENANCE / OTHER
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public decimal? Rating { get; set; } // 0-5
        public string ContractStatus { get; set; } = "ACTIVE"; // ACTIVE / EXPIRED / INACTIVE
        public DateTime? ContractStartDate { get; set; }
        public DateTime? ContractEndDate { get; set; }
        public string? Notes { get; set; }
    }
}
