namespace GymManagement.Core.DTOs.Health
{
    public class HealthProfileDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? HealthOverview { get; set; }
        public bool? ParqChestPainDuringExercise { get; set; }
        public bool? ParqDoctorAdvisedAgainstExercise { get; set; }
        public bool? ParqShortnessOfBreath { get; set; }
        public bool? ParqDizzinessOrFainting { get; set; }
        public bool? ParqRecentSurgery { get; set; }
        public string? SmokingStatus { get; set; }
        public string? AlcoholFrequency { get; set; }
        public string? StressLevel { get; set; }
        public decimal? SleepHours { get; set; }
        public string? DoctorName { get; set; }
        public string? DoctorClinic { get; set; }
        public string? DoctorContactNumber { get; set; }
        public string RiskLevel { get; set; } = "Low";
        public IReadOnlyList<string> ExerciseRestrictions { get; set; } = Array.Empty<string>();
        public bool IsCompleted { get; set; }
        public DateTime? LastAssessedAt { get; set; }
        public IReadOnlyList<MedicalConditionDto> MedicalConditions { get; set; } = Array.Empty<MedicalConditionDto>();
        public IReadOnlyList<MedicationDto> Medications { get; set; } = Array.Empty<MedicationDto>();
        public IReadOnlyList<InjuryDto> Injuries { get; set; } = Array.Empty<InjuryDto>();
        public IReadOnlyList<EmergencyContactDto> EmergencyContacts { get; set; } = Array.Empty<EmergencyContactDto>();
    }

    public class HealthProfileSummaryDto
    {
        public int UserId { get; set; }
        public string? MemberName { get; set; }
        public string RiskLevel { get; set; } = "Low";
        public bool IsCompleted { get; set; }
        public DateTime? LastAssessedAt { get; set; }
        public IReadOnlyList<string> MedicalConditionLabels { get; set; } = Array.Empty<string>();
        public IReadOnlyList<InjuryDto> ActiveInjuries { get; set; } = Array.Empty<InjuryDto>();
        public IReadOnlyList<string> ExerciseRestrictions { get; set; } = Array.Empty<string>();
        public bool RequiresMedicalClearance { get; set; }
    }

    public class MedicalConditionDto
    {
        public int? Id { get; set; }
        public string ConditionCode { get; set; } = string.Empty;
        public string? CustomConditionName { get; set; }
        public string? Notes { get; set; }
        public string Label { get; set; } = string.Empty;
    }

    public class MedicationDto
    {
        public int? Id { get; set; }
        public string MedicationName { get; set; } = string.Empty;
        public string? Dosage { get; set; }
        public string? Reason { get; set; }
    }

    public class InjuryDto
    {
        public int? Id { get; set; }
        public string BodyPart { get; set; } = string.Empty;
        public string InjuryType { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public string? Notes { get; set; }
    }

    public class EmergencyContactDto
    {
        public int? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Relationship { get; set; }
        public string Mobile { get; set; } = string.Empty;
    }

    public class UpsertHealthProfileDto
    {
        public string? HealthOverview { get; set; }
        public bool? ParqChestPainDuringExercise { get; set; }
        public bool? ParqDoctorAdvisedAgainstExercise { get; set; }
        public bool? ParqShortnessOfBreath { get; set; }
        public bool? ParqDizzinessOrFainting { get; set; }
        public bool? ParqRecentSurgery { get; set; }
        public string? SmokingStatus { get; set; }
        public string? AlcoholFrequency { get; set; }
        public string? StressLevel { get; set; }
        public decimal? SleepHours { get; set; }
        public string? DoctorName { get; set; }
        public string? DoctorClinic { get; set; }
        public string? DoctorContactNumber { get; set; }
        public bool MarkCompleted { get; set; } = true;
        public List<MedicalConditionDto> MedicalConditions { get; set; } = new();
        public List<MedicationDto> Medications { get; set; } = new();
        public List<InjuryDto> Injuries { get; set; } = new();
        public List<EmergencyContactDto> EmergencyContacts { get; set; } = new();
    }
}
