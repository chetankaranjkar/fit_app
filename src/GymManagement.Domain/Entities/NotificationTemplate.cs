namespace GymManagement.Domain.Entities;

/// <summary>Admin-editable email/SMS template (seeded from file defaults).</summary>
public class NotificationTemplate : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    /// <summary>Email or SMS.</summary>
    public string Channel { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>When true, Body was customized by admin (reset restores file default).</summary>
    public bool IsCustomized { get; set; }
}
