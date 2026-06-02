using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class DietPlansController : ControllerBase
    {
        private readonly IDietPlanService _service;

        public DietPlansController(IDietPlanService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DietPlanDto>>> GetAll()
        {
            var list = await _service.GetAllAsync();
            return Ok(list);
        }

        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<DietPlanDto>>> GetPaged(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12,
            [FromQuery] string? search = null,
            [FromQuery] string? goalType = null,
            [FromQuery] bool? isActive = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 100);
            var result = await _service.GetPagedAsync(safePage, safePageSize, search, goalType, isActive);
            return Ok(result);
        }

        [HttpGet("stats")]
        public async Task<ActionResult<DietPlanStatsDto>> GetStats()
        {
            return Ok(await _service.GetStatsAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DietPlanDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<DietPlanDto>> Create(CreateDietPlanDto dto)
        {
            var item = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<DietPlanDto>> Update(int id, UpdateDietPlanDto dto)
        {
            var item = await _service.UpdateAsync(id, dto);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpPost("meals")]
        public async Task<ActionResult<DietMealDto>> CreateMeal(CreateDietMealDto dto)
        {
            var item = await _service.CreateMealAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = dto.DietPlanId }, item);
        }

        [HttpPut("meals/{id}")]
        public async Task<ActionResult<DietMealDto>> UpdateMeal(int id, UpdateDietMealDto dto)
        {
            var item = await _service.UpdateMealAsync(id, dto);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpDelete("meals/{id}")]
        public async Task<IActionResult> DeleteMeal(int id)
        {
            var ok = await _service.DeleteMealAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpPost("meal-items")]
        public async Task<ActionResult<DietMealItemDto>> CreateMealItem(CreateDietMealItemDto dto)
        {
            var item = await _service.CreateMealItemAsync(dto);
            return Created("api/DietPlans/meal-items", item);
        }

        [HttpPut("meal-items/{id}")]
        public async Task<ActionResult<DietMealItemDto>> UpdateMealItem(int id, UpdateDietMealItemDto dto)
        {
            var item = await _service.UpdateMealItemAsync(id, dto);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpDelete("meal-items/{id}")]
        public async Task<IActionResult> DeleteMealItem(int id)
        {
            var ok = await _service.DeleteMealItemAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
