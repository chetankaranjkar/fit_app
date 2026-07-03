using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationComposerService : INotificationComposerService
{
    private readonly INotificationTemplateProvider _provider;
    private readonly INotificationTemplateRenderer _renderer;
    private readonly INotificationContextBuilder _contextBuilder;

    public NotificationComposerService(
        INotificationTemplateProvider provider,
        INotificationTemplateRenderer renderer,
        INotificationContextBuilder contextBuilder)
    {
        _provider = provider;
        _renderer = renderer;
        _contextBuilder = contextBuilder;
    }

    public async Task<RenderedNotificationDto> ComposeAsync(
        string templateCode,
        string channel,
        IReadOnlyDictionary<string, string?> placeholders,
        CancellationToken ct = default)
    {
        var template = await _provider.GetActiveAsync(templateCode, channel, ct)
            ?? throw new InvalidOperationException($"Template '{templateCode}' ({channel}) not found.");

        var common = await _contextBuilder.BuildCommonAsync(ct);
        var merged = NotificationContextBuilder.Merge(common, placeholders);

        return _renderer.RenderTemplate(template.Subject, template.Body, template.IsHtml, merged);
    }
}
