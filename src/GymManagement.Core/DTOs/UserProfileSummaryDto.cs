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

        /// <summary>In-flight membership (see <c>MemberOnboardingRules.ResolveCurrentMembership</c>).</summary>
        public int? CurrentMembershipId { get; set; }
        public string? CurrentMembershipStatus { get; set; }
        public string? CurrentMembershipPlanName { get; set; }
        public DateTime? CurrentMembershipEndDate { get; set; }

        /// <summary>End date of the most recent lapsed membership when there is no current one.</summary>
        public DateTime? LapsedMembershipEndDate { get; set; }

        /// <summary>Unpaid membership billing exists. Amounts stay on the Payments-gated billing APIs.</summary>
        public bool HasOpenBalance { get; set; }
        public bool IsPaymentOverdue { get; set; }
        public int? OpenMembershipId { get; set; }
    }
}
