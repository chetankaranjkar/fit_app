using GymManagement.Core.DTOs.Health;
using GymManagement.Core.Health;
using GymManagement.Domain.Entities.Health;

namespace GymManagement.Infrastructure.Services.Health
{
    public static class HealthProfileRiskEngine
    {
        public static (string RiskLevel, IReadOnlyList<string> Restrictions) Evaluate(UserHealthProfile profile)
        {
            var restrictions = new List<string>();
            var conditions = profile.MedicalConditions.Where(c => !c.IsDeleted).ToList();
            var injuries = profile.Injuries.Where(i => !i.IsDeleted).ToList();
            var activeInjuries = injuries.Where(i =>
                string.Equals(i.Status, "Active", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(i.Status, "Recovering", StringComparison.OrdinalIgnoreCase)).ToList();

            var parqPositive = new[]
            {
                profile.ParqChestPainDuringExercise,
                profile.ParqDoctorAdvisedAgainstExercise,
                profile.ParqShortnessOfBreath,
                profile.ParqDizzinessOrFainting,
                profile.ParqRecentSurgery,
            }.Any(v => v == true);

            if (parqPositive)
            {
                restrictions.Add("Obtain medical clearance before starting or intensifying exercise.");
            }

            if (conditions.Any(c => MedicalConditionCodes.HighRiskConditions.Contains(c.ConditionCode)))
            {
                restrictions.Add("Monitor intensity closely — cardiovascular or neurological condition reported.");
            }

            if (conditions.Any(c => string.Equals(c.ConditionCode, MedicalConditionCodes.HighBloodPressure, StringComparison.OrdinalIgnoreCase)))
            {
                restrictions.Add("Avoid maximal-effort lifts without physician guidance.");
            }

            if (conditions.Any(c => string.Equals(c.ConditionCode, MedicalConditionCodes.Asthma, StringComparison.OrdinalIgnoreCase)))
            {
                restrictions.Add("Keep rescue inhaler accessible; allow extended warm-up.");
            }

            foreach (var injury in activeInjuries)
            {
                if (string.Equals(injury.BodyPart, "Knee", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(injury.BodyPart, "Back", StringComparison.OrdinalIgnoreCase))
                {
                    restrictions.Add($"Modify lower-body / spinal loading — {injury.BodyPart} {injury.Status.ToLower()} injury.");
                }
                else
                {
                    restrictions.Add($"Adapt exercises for {injury.BodyPart} ({injury.Status}).");
                }
            }

            if (string.Equals(profile.SmokingStatus, "Daily", StringComparison.OrdinalIgnoreCase))
            {
                restrictions.Add("Prioritize gradual cardio progression — daily smoker.");
            }

            if (profile.SleepHours is < 6)
            {
                restrictions.Add("Recovery-focused programming — reported sleep under 6 hours.");
            }

            var risk = HealthRiskLevels.Low;

            if (parqPositive ||
                conditions.Any(c => MedicalConditionCodes.HighRiskConditions.Contains(c.ConditionCode)) ||
                conditions.Count >= 3 ||
                activeInjuries.Any(i => string.Equals(i.Status, "Active", StringComparison.OrdinalIgnoreCase)))
            {
                risk = HealthRiskLevels.High;
            }
            else if (conditions.Count >= 1 ||
                     activeInjuries.Count > 0 ||
                     string.Equals(profile.StressLevel, "High", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(profile.SmokingStatus, "Daily", StringComparison.OrdinalIgnoreCase) ||
                     profile.SleepHours is < 6)
            {
                risk = HealthRiskLevels.Moderate;
            }

            return (risk, restrictions.Distinct(StringComparer.OrdinalIgnoreCase).ToList());
        }
    }
}
