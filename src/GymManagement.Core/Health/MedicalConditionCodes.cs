namespace GymManagement.Core.Health
{
    public static class MedicalConditionCodes
    {
        public const string Diabetes = "Diabetes";
        public const string HighBloodPressure = "HighBloodPressure";
        public const string Asthma = "Asthma";
        public const string HeartDisease = "HeartDisease";
        public const string Arthritis = "Arthritis";
        public const string Thyroid = "Thyroid";
        public const string Epilepsy = "Epilepsy";
        public const string HighCholesterol = "HighCholesterol";
        public const string Obesity = "Obesity";
        public const string BackPain = "BackPain";
        public const string KneePain = "KneePain";
        public const string Other = "Other";

        public static readonly IReadOnlyList<string> All =
        [
            Diabetes, HighBloodPressure, Asthma, HeartDisease, Arthritis, Thyroid,
            Epilepsy, HighCholesterol, Obesity, BackPain, KneePain, Other,
        ];

        public static readonly HashSet<string> HighRiskConditions = new(StringComparer.OrdinalIgnoreCase)
        {
            HeartDisease, Epilepsy,
        };
    }

    public static class HealthRiskLevels
    {
        public const string Low = "Low";
        public const string Moderate = "Moderate";
        public const string High = "High";
    }
}
