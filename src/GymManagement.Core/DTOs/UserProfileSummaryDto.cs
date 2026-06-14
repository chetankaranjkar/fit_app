namespace GymManagement.Core.DTOs
{
    /// <summary>
    /// Lightweight aggregates for member profile hero stats and onboarding checklist
    /// without loading full attendance, metrics, or assignment lists.
    /// </summary>
    public class UserProfileSummaryDto
    {
        public decimal? LatestWeightKg { get; set; }
        public decimal? LatestHeightCm { get; set; }
        public decimal? Bmi { get; set; }
        public int Streak { get; set; }
        public int VisitsThisMonth { get; set; }
        public int TotalVisits { get; set; }

        public bool HasActiveMembership { get; set; }
        public bool HasWorkoutAssignment { get; set; }
        public bool HasDietAssignment { get; set; }
        public bool HasAnyDietAssignment { get; set; }
        public string? PrimaryDietPlanName { get; set; }
    }
}
