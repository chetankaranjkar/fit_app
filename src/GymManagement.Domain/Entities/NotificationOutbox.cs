namespace GymManagement.Domain.Entities;

/// <summary>Queued outbound notification awaiting background dispatch.</summary>
public class NotificationOutbox : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string NotificationType { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public int? MemberId { get; set; }
    public string Recipient { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; }
    public string Status { get; set; } = "Pending";
    public string? PayloadJson { get; set; }
    public string? AttachmentPathsJson { get; set; }
    public int RetryCount { get; set; }
    public int MaxRetries { get; set; } = 3;
    public DateTime? ScheduledForUtc { get; set; }
    public DateTime? ProcessedAtUtc { get; set; }
    public string? ErrorMessage { get; set; }
    public int? CreatedByUserId { get; set; }
}
