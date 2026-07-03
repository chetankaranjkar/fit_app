using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationTemplateProvider : INotificationTemplateProvider
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<NotificationTemplateProvider> _logger;

    public NotificationTemplateProvider(
        ApplicationDbContext db,
        ILogger<NotificationTemplateProvider> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<NotificationTemplateDto?> GetActiveAsync(string templateCode, string channel, CancellationToken ct = default)
    {
        var row = await _db.NotificationTemplates.AsNoTracking()
            .FirstOrDefaultAsync(
                t => !t.IsDeleted && t.IsActive && t.TemplateCode == templateCode && t.Channel == channel,
                ct);

        if (row != null)
            return Map(row);

        var body = await GetDefaultBodyFromFileAsync(templateCode, channel, ct);
        if (body == null)
            return null;

        var subject = await GetDefaultSubjectFromFileAsync(templateCode, channel, ct);
        return new NotificationTemplateDto
        {
            TemplateCode = templateCode,
            TemplateName = templateCode,
            Channel = channel,
            Subject = subject,
            Body = body,
            IsHtml = channel == NotificationChannels.Email,
            IsActive = true,
            IsCustomized = false,
        };
    }

    public Task<string?> GetDefaultBodyFromFileAsync(string templateCode, string channel, CancellationToken ct = default)
    {
        var folder = channel == NotificationChannels.Sms ? "Sms" : "Emails";
        var ext = channel == NotificationChannels.Sms ? ".txt" : ".html";
        var path = ResolveTemplatePath(folder, templateCode + ext);

        if (!File.Exists(path))
        {
            _logger.LogDebug("Template file not found: {Path}", path);
            return Task.FromResult<string?>(null);
        }

        return Task.FromResult<string?>(File.ReadAllText(path));
    }

    public Task<string?> GetDefaultSubjectFromFileAsync(string templateCode, string channel, CancellationToken ct = default)
    {
        if (channel == NotificationChannels.Sms)
            return Task.FromResult<string?>(null);

        var path = ResolveTemplatePath("Emails", templateCode + ".subject.txt");

        return Task.FromResult<string?>(File.Exists(path) ? File.ReadAllText(path).Trim() : null);
    }

    private static string ResolveTemplatePath(string folder, string fileName)
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Templates", folder, fileName),
            Path.Combine(Path.GetDirectoryName(typeof(NotificationTemplateProvider).Assembly.Location) ?? "", "Templates", folder, fileName),
        };
        return candidates.FirstOrDefault(File.Exists) ?? candidates[0];
    }

    private static NotificationTemplateDto Map(NotificationTemplate t) => new()
    {
        Id = t.Id,
        TemplateCode = t.TemplateCode,
        TemplateName = t.TemplateName,
        Channel = t.Channel,
        Subject = t.Subject,
        Body = t.Body,
        IsHtml = t.IsHtml,
        IsActive = t.IsActive,
        IsCustomized = t.IsCustomized,
        CreatedDate = t.CreatedDate,
        UpdatedDate = t.UpdatedDate,
    };
}
