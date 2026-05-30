using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.Supplements;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SupplementMasterController : ControllerBase
{
    private readonly ISupplementTrackingService _service;

    public SupplementMasterController(ISupplementTrackingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SupplementMasterDto>>> List(
        [FromQuery] bool activeOnly = true,
        CancellationToken cancellationToken = default)
        => Ok(await _service.ListMasterAsync(activeOnly, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SupplementMasterDto>> GetById(int id, CancellationToken cancellationToken = default)
    {
        var dto = await _service.GetMasterByIdAsync(id, cancellationToken);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.UsersAccess)]
    public async Task<ActionResult<SupplementMasterDto>> Create(
        [FromBody] UpsertSupplementMasterDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _service.CreateMasterAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [HasPermission(PermissionCodes.UsersAccess)]
    public async Task<ActionResult<SupplementMasterDto>> Update(
        int id,
        [FromBody] UpsertSupplementMasterDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _service.UpdateMasterAsync(id, dto, cancellationToken));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [HasPermission(PermissionCodes.UsersAccess)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.DeleteMasterAsync(id, cancellationToken);
            return NoContent();
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
