using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs;

public sealed class CreateGymLeadDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Gender { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Occupation { get; set; }
    public string? FitnessGoal { get; set; }
    /// <summary>Required on create. Canonical code (e.g. FACEBOOK, GOOGLE_SEARCH, OTHER).</summary>
    public string? LeadSource { get; set; }
    /// <summary>Required when <see cref="LeadSource"/> is OTHER.</summary>
    public string? CustomLeadSource { get; set; }
    public string? ReferenceName { get; set; }
    public string? Notes { get; set; }
    public int? OrganizationId { get; set; }
}

public sealed class UpdateGymLeadDto
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Occupation { get; set; }
    public string? FitnessGoal { get; set; }
    public string? LeadSource { get; set; }
    public string? CustomLeadSource { get; set; }
    public string? ReferenceName { get; set; }
    public string? Notes { get; set; }
    public int? OrganizationId { get; set; }
}

public class GymLeadSummaryDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public LeadPipelineStatus Status { get; set; }
    public string? LeadSource { get; set; }
    public string? CustomLeadSource { get; set; }
    public DateTime? NextFollowUpAt { get; set; }
    public DateTime CreatedDate { get; set; }
    public int? ConvertedMemberId { get; set; }
}

public sealed class GymLeadDetailDto : GymLeadSummaryDto
{
    public string Gender { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Occupation { get; set; }
    public string? FitnessGoal { get; set; }
    public string? ReferenceName { get; set; }
    public string? Notes { get; set; }
    public DateTime? ConvertedAtUtc { get; set; }
    public int? OrganizationId { get; set; }
    public IReadOnlyList<LeadFollowupDto> Followups { get; set; } = Array.Empty<LeadFollowupDto>();
    public IReadOnlyList<LeadTrialDto> Trials { get; set; } = Array.Empty<LeadTrialDto>();
}

public sealed class LeadFollowupDto
{
    public int Id { get; set; }
    public int GymLeadId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime? NextFollowUpAt { get; set; }
    public string? CallRemarks { get; set; }
    public int? CreatedByUserId { get; set; }
    public DateTime CreatedDate { get; set; }
}

public sealed class CreateLeadFollowupDto
{
    public string Notes { get; set; } = string.Empty;
    public DateTime? NextFollowUpAt { get; set; }
    public string? CallRemarks { get; set; }
}

public sealed class LeadTrialDto
{
    public int Id { get; set; }
    public int GymLeadId { get; set; }
    public DateTime TrialDate { get; set; }
    public int AssignedTrainerId { get; set; }
    public string? AssignedTrainerName { get; set; }
    public string? Feedback { get; set; }
    public int? ConversionProbability { get; set; }
    public DateTime CreatedDate { get; set; }
}

public sealed class CreateLeadTrialDto
{
    public DateTime TrialDate { get; set; }
    public int AssignedTrainerId { get; set; }
    public string? Feedback { get; set; }
    public int? ConversionProbability { get; set; }
}

public sealed class UpdateLeadTrialDto
{
    public string? Feedback { get; set; }
    public int? ConversionProbability { get; set; }
}

public sealed class SetLeadStatusDto
{
    public LeadPipelineStatus Status { get; set; }
}

public sealed class ConvertLeadToMemberDto
{
    public int PlanId { get; set; }
    public DateTime? MembershipStartDate { get; set; }
    public int? TrainerId { get; set; }
    public string? Password { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public List<int>? MemberUserTypeIds { get; set; }
}

public sealed class LeadConversionResultDto
{
    public GymLeadDetailDto Lead { get; set; } = null!;
    public UserDto Member { get; set; } = null!;
}

public sealed class ReceptionDashboardDto
{
    public int TodaysLeads { get; set; }
    public int TodaysAdmissions { get; set; }
    public int PendingFollowUps { get; set; }
    public int ActiveMembers { get; set; }
    public int ExpiringMemberships { get; set; }
}

public sealed class LeadSourceStatDto
{
    public string Source { get; set; } = string.Empty;
    public int Count { get; set; }
}

public sealed class TrainerLeadStatDto
{
    public int TrainerId { get; set; }
    public string TrainerName { get; set; } = string.Empty;
    public int AssignedTrials { get; set; }
    public int ConvertedLeadsTouched { get; set; }
}

public sealed class LeadAnalyticsDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int NewLeadsInMonth { get; set; }
    public int AdmissionsInMonth { get; set; }
    public decimal ConversionRatePercent { get; set; }
    /// <summary>Legacy per-value counts (all distinct LeadSource strings in the month).</summary>
    public IReadOnlyList<LeadSourceStatDto> LeadSources { get; set; } = Array.Empty<LeadSourceStatDto>();
    /// <summary>Chart buckets: Facebook, Instagram, Google, Walk-in, Other.</summary>
    public IReadOnlyList<LeadSourceStatDto> GroupedLeadSources { get; set; } = Array.Empty<LeadSourceStatDto>();
    /// <summary>Breakdown inside the &quot;Other&quot; bucket (custom text and non-primary channels).</summary>
    public IReadOnlyList<LeadSourceStatDto> OtherSourceDetails { get; set; } = Array.Empty<LeadSourceStatDto>();
    public IReadOnlyList<TrainerLeadStatDto> TrainerStats { get; set; } = Array.Empty<TrainerLeadStatDto>();
}

public sealed class LeadKanbanDto
{
    public IReadOnlyList<LeadKanbanColumnDto> Columns { get; set; } = Array.Empty<LeadKanbanColumnDto>();
}

public sealed class LeadKanbanColumnDto
{
    public LeadPipelineStatus Status { get; set; }
    public IReadOnlyList<GymLeadSummaryDto> Leads { get; set; } = Array.Empty<GymLeadSummaryDto>();
}

public sealed class MembershipPlanOptionDto
{
    public int Id { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public decimal Price { get; set; }
}

public sealed class LeadTrainerOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
