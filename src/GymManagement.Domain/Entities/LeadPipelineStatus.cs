namespace GymManagement.Domain.Entities;

/// <summary>Pipeline for gym lead → membership conversion (stored as string in <c>gym_leads.status</c>).</summary>
public enum LeadPipelineStatus
{
    NEW,
    CONTACTED,
    FOLLOWUP,
    TRIAL,
    INTERESTED,
    NOT_INTERESTED,
    CONVERTED,
}
