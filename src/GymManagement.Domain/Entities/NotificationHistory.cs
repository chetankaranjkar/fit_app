namespace GymManagement.Domain.Entities;

/// <summary>Audit log of outbound email/SMS delivery attempts.</summary>
public class NotificationHistory : BaseEntity
{
    public int? MemberId { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? SentDate { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public int? CreatedByUserId { get; set; }
    public int? DurationMs { get; set; }
}
