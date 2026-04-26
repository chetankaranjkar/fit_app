namespace GymManagement.Core.DTOs
{
    public class BodyMetricsDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
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
    }

    public class CreateBodyMetricsDto
    {
        public int UserId { get; set; }
        public DateTime? MeasurementDate { get; set; }
        public decimal WeightKg { get; set; }
        public decimal? BodyFatPct { get; set; }
        public decimal? MuscleMassKg { get; set; }
        public decimal? ChestCm { get; set; }
        public decimal? WaistCm { get; set; }
        public decimal? HipsCm { get; set; }
        public decimal? BicepsCm { get; set; }
        public decimal? ThighsCm { get; set; }
        public decimal? NeckCm { get; set; }
        public decimal? ShouldersCm { get; set; }
        public decimal? ForearmsCm { get; set; }
        public decimal? CalvesCm { get; set; }
        public decimal? HeightCm { get; set; }
        public string? Notes { get; set; }
        public string? ProgressPictureUrl { get; set; }
    }

    public class UpdateBodyMetricsDto
    {
        public DateTime? MeasurementDate { get; set; }
        public decimal? WeightKg { get; set; }
        public decimal? BodyFatPct { get; set; }
        public decimal? MuscleMassKg { get; set; }
        public decimal? ChestCm { get; set; }
        public decimal? WaistCm { get; set; }
        public decimal? HipsCm { get; set; }
        public decimal? BicepsCm { get; set; }
        public decimal? ThighsCm { get; set; }
        public decimal? NeckCm { get; set; }
        public decimal? ShouldersCm { get; set; }
        public decimal? ForearmsCm { get; set; }
        public decimal? CalvesCm { get; set; }
        public decimal? HeightCm { get; set; }
        public string? Notes { get; set; }
        public string? ProgressPictureUrl { get; set; }
    }
}

