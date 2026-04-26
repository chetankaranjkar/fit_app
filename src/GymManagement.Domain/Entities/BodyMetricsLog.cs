namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// History of body measurements per user. Latest snapshot is in UserDetails.
    /// </summary>
    public class BodyMetricsLog : BaseEntity
    {
        public int UserId { get; set; }
        public DateTime MeasurementDate { get; set; }

        // Weight and Body Composition
        public decimal WeightKg { get; set; }
        public decimal? BodyFatPct { get; set; }
        public decimal? MuscleMassKg { get; set; }

        // Body Measurements (in cm)
        public decimal? ChestCm { get; set; }
        public decimal? WaistCm { get; set; }
        public decimal? HipsCm { get; set; }
        public decimal? BicepsCm { get; set; }
        public decimal? ThighsCm { get; set; }
        public decimal? NeckCm { get; set; }
        public decimal? ShouldersCm { get; set; }
        public decimal? ForearmsCm { get; set; }
        public decimal? CalvesCm { get; set; }

        // Additional metrics
        public decimal? HeightCm { get; set; }
        public string? Notes { get; set; }
        public string? ProgressPictureUrl { get; set; }

        public User User { get; set; } = null!;
    }
}

