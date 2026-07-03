using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

/// <summary>Admin SMS / WhatsApp webhook configuration.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[HasPermissionOrAdmin(PermissionCodes.Config)]
public class SmsSettingsController : ControllerBase
{
    private readonly ISmsSettingsService _settings;
    private readonly ISmsTransportService _smsTransport;

    public SmsSettingsController(ISmsSettingsService settings, ISmsTransportService smsTransport)
    {
        _settings = settings;
        _smsTransport = smsTransport;
    }

    [HttpGet]
    public async Task<ActionResult<SmsSettingsDto>> Get(CancellationToken ct)
    {
        return Ok(await _settings.GetAsync(ct));
    }

    [HttpPut]
    public async Task<ActionResult<SmsSettingsDto>> Update([FromBody] UpdateSmsSettingsDto dto, CancellationToken ct)
    {
        try
        {
            return Ok(await _settings.UpdateAsync(dto, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("test")]
    public async Task<IActionResult> SendTest([FromBody] TestSmsSettingsDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.ToPhone))
            return BadRequest(new { message = "Recipient phone number is required." });

        var channel = string.Equals(dto.Channel, TextMessageChannels.WhatsApp, StringComparison.OrdinalIgnoreCase)
            ? TextMessageChannels.WhatsApp
            : TextMessageChannels.Sms;
        var label = channel == TextMessageChannels.WhatsApp ? "WhatsApp" : "SMS";

        try
        {
            await _smsTransport.SendTestAsync(channel, dto.ToPhone.Trim(), ct);
            return Ok(new { message = $"Test {label} sent via webhook." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(502, new { message = $"Could not reach the {label} webhook. Check the URL and auth header." });
        }
    }
}
