using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/notification-templates")]
[Authorize]
public class NotificationTemplatesController : ControllerBase
{
    private readonly INotificationTemplateService _templates;
    private readonly INotificationOutboxService _outbox;
    private readonly INotificationHistoryService _history;

    public NotificationTemplatesController(
        INotificationTemplateService templates,
        INotificationOutboxService outbox,
        INotificationHistoryService history)
    {
        _templates = templates;
        _outbox = outbox;
        _history = history;
    }

    [HttpGet]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<ActionResult<object>> List([FromQuery] NotificationTemplateQueryDto query, CancellationToken ct)
    {
        await _templates.EnsureSeededAsync(ct);
        var items = await _templates.ListAsync(query, ct);
        var total = await _templates.CountAsync(query, ct);
        return Ok(new { items, total, page = query.Page, pageSize = query.PageSize });
    }

    [HttpGet("{id:int}")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<ActionResult<NotificationTemplateDto>> Get(int id, CancellationToken ct)
    {
        var dto = await _templates.GetByIdAsync(id, ct);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPut("{id:int}")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<ActionResult<NotificationTemplateDto>> Update(int id, [FromBody] UpdateNotificationTemplateDto dto, CancellationToken ct) =>
        Ok(await _templates.UpdateAsync(id, dto, ct));

    [HttpPost("{id:int}/reset")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<ActionResult<NotificationTemplateDto>> Reset(int id, CancellationToken ct) =>
        Ok(await _templates.ResetToDefaultAsync(id, ct));

    [HttpGet("{id:int}/preview")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<ActionResult<NotificationTemplatePreviewDto>> Preview(int id, CancellationToken ct) =>
        Ok(await _templates.PreviewAsync(id, ct));

    [HttpGet("placeholders")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public ActionResult<IReadOnlyDictionary<string, string?>> Placeholders() =>
        Ok(_templates.GetSamplePlaceholders());

    [HttpPost("{id:int}/test-send")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<IActionResult> TestSend(int id, [FromBody] NotificationTemplateTestSendDto dto, CancellationToken ct)
    {
        var template = await _templates.GetByIdAsync(id, ct);
        if (template == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Recipient))
            return BadRequest(new { message = "Recipient is required." });

        var placeholders = _templates.GetSamplePlaceholders();
        await _outbox.EnqueueAsync(new EnqueueNotificationRequest
        {
            TemplateCode = template.TemplateCode,
            Channel = template.Channel,
            Recipient = dto.Recipient.Trim(),
            Placeholders = placeholders.ToDictionary(kv => kv.Key, kv => kv.Value),
            SendImmediately = true,
        }, ct);

        return Ok(new { message = "Test notification queued for immediate delivery." });
    }

    [HttpGet("history")]
    [HasPermissionOrAdmin(PermissionCodes.Config)]
    public async Task<ActionResult<IReadOnlyList<NotificationHistoryDto>>> History(
        [FromQuery] int? memberId,
        [FromQuery] int take = 50,
        CancellationToken ct = default) =>
        Ok(await _history.ListAsync(memberId, take, ct));
}
