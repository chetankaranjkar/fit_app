namespace GymManagement.Core.DTOs;

public sealed class NotificationTemplateDto
{
    public int Id { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; }
    public bool IsActive { get; set; }
    public bool IsCustomized { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
}

public sealed class UpdateNotificationTemplateDto
{
    public string? TemplateName { get; set; }
    public string? Subject { get; set; }
    public string? Body { get; set; }
    public bool? IsActive { get; set; }
}

public sealed class NotificationTemplatePreviewDto
{
    public string TemplateCode { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; }
}

public sealed class NotificationTemplateTestSendDto
{
    public string Recipient { get; set; } = string.Empty;
    public string? TemplateCode { get; set; }
    public string? Channel { get; set; }
}

public sealed class NotificationHistoryDto
{
    public int Id { get; set; }
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
    public DateTime CreatedDate { get; set; }
}

public sealed class NotificationTemplateQueryDto
{
    public string? Search { get; set; }
    public string? Channel { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public sealed class EnqueueNotificationRequest
{
    public string TemplateCode { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public int? MemberId { get; set; }
    public string Recipient { get; set; } = string.Empty;
    public Dictionary<string, string?> Placeholders { get; set; } = new();
    public string? PayloadJson { get; set; }
    public IReadOnlyList<string>? AttachmentPaths { get; set; }
    public int? CreatedByUserId { get; set; }
    public bool SendImmediately { get; set; }
}

public sealed class RenderedNotificationDto
{
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; }
}
