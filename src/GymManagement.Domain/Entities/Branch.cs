namespace GymManagement.Domain.Entities
{
    public class Branch
    {
        public int Id { get; set; }
        public int? OrganizationId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }
        /// <summary>WGS84 latitude for QR scan proximity checks (degrees).</summary>
        public double? Latitude { get; set; }
        /// <summary>WGS84 longitude for QR scan proximity checks (degrees).</summary>
        public double? Longitude { get; set; }
        /// <summary>
        /// Added to the default 100 m QR check-in radius for this branch (can be negative).
        /// Effective radius is clamped between 10 m and 10,000 m.
        /// </summary>
        public int CheckInRadiusOffsetMeters { get; set; }
        /// <summary>Optional dedicated ESP32 base URL (<c>http://ip</c>) when each branch runs its own device; appended with <c>/unlock</c>.</summary>
        public string? Esp32DoorBaseUrl { get; set; }
        public bool IsActive { get; set; } = true;

        public Organization? Organization { get; set; }
        public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
        public ICollection<GymQrCode> GymQrCodes { get; set; } = new List<GymQrCode>();
    }
}
