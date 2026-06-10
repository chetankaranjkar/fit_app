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
[Route("api/workout-categories")]
[Authorize]
[HasPermission(PermissionCodes.TrainerAccess)]
public class WorkoutCategoriesController : ControllerBase
{
    private readonly IWorkoutCategoryService _categoryService;
    private readonly ApplicationDbContext _db;

    public WorkoutCategoriesController(IWorkoutCategoryService categoryService, ApplicationDbContext db)
    {
        _categoryService = categoryService;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkoutCategorySummaryDto>>> GetAll()
        => Ok(await _categoryService.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WorkoutCategoryDto>> GetById(int id)
    {
        var item = await _categoryService.GetByIdAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutCategoryDto>> Create(CreateWorkoutCategoryDto dto, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var created = await _categoryService.CreateAsync(dto, userId, userName);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WorkoutCategoryDto>> Update(int id, UpdateWorkoutCategoryDto dto, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var updated = await _categoryService.UpdateAsync(id, dto, userId, userName);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var deleted = await _categoryService.DeleteAsync(id, userId, userName);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPut("{id:int}/warmup-stretch")]
    public async Task<ActionResult<WorkoutCategoryDto>> SaveWarmupStretch(
        int id,
        SaveCategoryWarmupStretchDto dto,
        CancellationToken ct)
    {
        var (userId, userName) = await HttpContext.GetAuditActorAsync(_db, ct);
        var updated = await _categoryService.SaveWarmupStretchAsync(id, dto, userId, userName);
        return updated == null ? NotFound() : Ok(updated);
    }
}
