namespace GymManagement.Core.DTOs
{
    public class UserDetailDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public decimal Height { get; set; }
        public decimal Weight { get; set; }
        public decimal BMR { get; set; }
        public decimal BMI { get; set; }
        public decimal? BodyFatPercentage { get; set; }
        public decimal? MuscleMass { get; set; }
        public decimal? TargetWeight { get; set; }
        public string? GoalType { get; set; }
        public string? ActivityLevel { get; set; }
        public DateTime MeasurementDate { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateUserDetailDto
    {
        public int UserId { get; set; }
        public decimal Height { get; set; }
        public decimal Weight { get; set; }
        public decimal? BodyFatPercentage { get; set; }
        public decimal? MuscleMass { get; set; }
        public decimal? TargetWeight { get; set; }
        public string? GoalType { get; set; }
        public string? ActivityLevel { get; set; }
        public string? Notes { get; set; }
    }
}

