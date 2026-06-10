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
[Route("api/warmups")]
[Authorize]
[HasPermission(PermissionCodes.TrainerAccess)]
public class WarmupsController : ControllerBase
{
    private readonly IWarmupService _warmupService;
    private readonly ApplicationDbContext _db;

    public WarmupsController(IWarmupService warmupService, ApplicationDbContext db)
    {
        _warmupService = warmupService;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarmupDto>>> GetAll()
    {
        var items = await _warmupService.GetAllAsync();
        return Ok(items);
    }

    [HttpGet("paged")]
    public async Task<ActionResult<PagedWarmupsDto>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? bodyPart = null,
        [FromQuery] bool? isActive = null)
    {
        var safePage = page < 1 ? 1 : page;
        var safePageSize = Math.Clamp(pageSize, 1, 100);
        var result = await _warmupService.GetPagedAsync(safePage, safePageSize, search, difficulty, bodyPart, isActive);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WarmupDto>> GetById(int id)
    {
        var item = await _warmupService.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<WarmupDto>> Create(CreateWarmupDto dto, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var created = await _warmupService.CreateAsync(dto, userId, userName);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WarmupDto>> Update(int id, UpdateWarmupDto dto, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var updated = await _warmupService.UpdateAsync(id, dto, userId, userName);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var deleted = await _warmupService.DeleteAsync(id, userId, userName);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
