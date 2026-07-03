using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

/// <summary>Admin SMTP email configuration (Gmail, Outlook, custom).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[HasPermissionOrAdmin(PermissionCodes.Config)]
public class EmailSettingsController : ControllerBase
{
    private readonly IEmailSettingsService _settings;
    private readonly IOutboundEmailService _email;

    public EmailSettingsController(IEmailSettingsService settings, IOutboundEmailService email)
    {
        _settings = settings;
        _email = email;
    }

    [HttpGet]
    public async Task<ActionResult<EmailSettingsDto>> Get(CancellationToken ct)
    {
        return Ok(await _settings.GetAsync(ct));
    }

    [HttpPut]
    public async Task<ActionResult<EmailSettingsDto>> Update([FromBody] UpdateEmailSettingsDto dto, CancellationToken ct)
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
    public async Task<IActionResult> SendTest([FromBody] TestEmailSettingsDto dto, CancellationToken ct)
    {
        try
        {
            await _email.SendTestEmailAsync(dto.ToAddress, ct);
            return Ok(new { message = "Test email sent." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception)
        {
            return StatusCode(502, new { message = "Could not send test email. Check SMTP host, port, and app password." });
        }
    }
}
