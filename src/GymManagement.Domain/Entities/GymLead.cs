namespace GymManagement.Domain.Entities;

/// <summary>New lead / inquiry before membership (table <c>gym_leads</c>).</summary>
public class GymLead : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Gender { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Occupation { get; set; }
    public string? FitnessGoal { get; set; }
    /// <summary>Canonical lead source code (e.g. FACEBOOK, OTHER). Max 100 in DB.</summary>
    public string? LeadSource { get; set; }
    /// <summary>When <see cref="LeadSource"/> is OTHER, free-text detail from the prospect.</summary>
    public string? CustomLeadSource { get; set; }
    public string? ReferenceName { get; set; }
    public string? Notes { get; set; }

    public LeadPipelineStatus Status { get; set; } = LeadPipelineStatus.NEW;

    /// <summary>Denormalized next touch date for reception dashboards (updated when follow-ups are logged).</summary>
    public DateTime? NextFollowUpAt { get; set; }

    public int? ConvertedMemberId { get; set; }
    public DateTime? ConvertedAtUtc { get; set; }

    public int? OrganizationId { get; set; }

    public User? ConvertedMember { get; set; }
    public Organization? Organization { get; set; }

    public ICollection<LeadFollowup> Followups { get; set; } = new List<LeadFollowup>();
    public ICollection<LeadTrial> Trials { get; set; } = new List<LeadTrial>();
}
