namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationTemplateRenderer : GymManagement.Core.Services.INotificationTemplateRenderer
{
    public string Render(string template, IReadOnlyDictionary<string, string?> placeholders)
    {
        if (string.IsNullOrEmpty(template))
            return string.Empty;

        var result = template;
        foreach (var (key, value) in placeholders)
        {
            var safe = value ?? string.Empty;
            result = result.Replace("{{" + key + "}}", safe, StringComparison.OrdinalIgnoreCase);
        }

        // Strip any unreplaced placeholders
        return System.Text.RegularExpressions.Regex.Replace(result, @"\{\{[A-Za-z0-9]+\}\}", string.Empty);
    }

    public GymManagement.Core.DTOs.RenderedNotificationDto RenderTemplate(
        string? subjectTemplate,
        string bodyTemplate,
        bool isHtml,
        IReadOnlyDictionary<string, string?> placeholders)
    {
        return new GymManagement.Core.DTOs.RenderedNotificationDto
        {
            Subject = string.IsNullOrWhiteSpace(subjectTemplate) ? null : Render(subjectTemplate, placeholders),
            Body = Render(bodyTemplate, placeholders),
            IsHtml = isHtml,
        };
    }
}
