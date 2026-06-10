using GymManagement.API.Attributes;
using GymManagement.API.Extensions;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/stretches")]
[Authorize]
[HasPermission(PermissionCodes.TrainerAccess)]
public class StretchesController : ControllerBase
{
    private readonly IStretchService _stretchService;
    private readonly ApplicationDbContext _db;

    public StretchesController(IStretchService stretchService, ApplicationDbContext db)
    {
        _stretchService = stretchService;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StretchDto>>> GetAll()
    {
        var items = await _stretchService.GetAllAsync();
        return Ok(items);
    }

    [HttpGet("paged")]
    public async Task<ActionResult<PagedStretchesDto>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? bodyPart = null,
        [FromQuery] bool? isActive = null)
    {
        var safePage = page < 1 ? 1 : page;
        var safePageSize = Math.Clamp(pageSize, 1, 100);
        var result = await _stretchService.GetPagedAsync(safePage, safePageSize, search, difficulty, bodyPart, isActive);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StretchDto>> GetById(int id)
    {
        var item = await _stretchService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<StretchDto>> Create(CreateStretchDto dto, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var created = await _stretchService.CreateAsync(dto, userId, userName);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StretchDto>> Update(int id, UpdateStretchDto dto, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var updated = await _stretchService.UpdateAsync(id, dto, userId, userName);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var deleted = await _stretchService.DeleteAsync(id, userId, userName);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
