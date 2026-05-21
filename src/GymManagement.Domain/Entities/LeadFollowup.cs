namespace GymManagement.Domain.Entities;

/// <summary>Follow-up note / call log for a lead (table <c>lead_followups</c>).</summary>
public class LeadFollowup : BaseEntity
{
    public int GymLeadId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime? NextFollowUpAt { get; set; }
    public string? CallRemarks { get; set; }
    public int? CreatedByUserId { get; set; }

    public GymLead GymLead { get; set; } = null!;
    public User? CreatedByUser { get; set; }
}
