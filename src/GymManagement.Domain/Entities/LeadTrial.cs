namespace GymManagement.Domain.Entities;

/// <summary>Trial session for a lead (table <c>lead_trials</c>).</summary>
public class LeadTrial : BaseEntity
{
    public int GymLeadId { get; set; }
    public DateTime TrialDate { get; set; }
    public int AssignedTrainerId { get; set; }
    public string? Feedback { get; set; }
    /// <summary>0–100 subjective likelihood after trial.</summary>
    public int? ConversionProbability { get; set; }

    public GymLead GymLead { get; set; } = null!;
    public Trainer AssignedTrainer { get; set; } = null!;
}
