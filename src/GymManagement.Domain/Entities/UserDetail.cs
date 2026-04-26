namespace GymManagement.Domain.Entities
{
    public class UserDetail : BaseEntity
    {
        public int UserId { get; set; }
        public decimal Height { get; set; } // in cm
        public decimal Weight { get; set; } // in kg
        public decimal BMR { get; set; } // Basal Metabolic Rate
        public decimal BMI { get; set; } // Body Mass Index
        public decimal? BodyFatPercentage { get; set; }
        public decimal? MuscleMass { get; set; }
        public decimal? TargetWeight { get; set; } // in kg
        public string? GoalType { get; set; } // e.g., "Weight Loss", "Muscle Gain", "Maintenance", "Body Recomposition"
        public string? ActivityLevel { get; set; } // e.g., "Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"
        public DateTime MeasurementDate { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
    }
}