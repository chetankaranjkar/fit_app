using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.GymOps
{
    [ApiController]
    [Route("api/gym-operations/cleaning")]
    [Authorize]
    public class CleaningLogsController : ControllerBase
    {
        private readonly ICleaningLogService _service;

        public CleaningLogsController(ICleaningLogService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CleaningLogDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<ActionResult<CleaningLogDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<CleaningLogDto>> Create(CreateCleaningLogDto dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        [HttpPatch("{logId}/tasks/{taskId}")]
        public async Task<ActionResult<CleaningTaskItemDto>> UpdateTask(int logId, int taskId, UpdateCleaningTaskDto dto)
        {
            var updated = await _service.UpdateTaskAsync(logId, taskId, dto);
            return updated == null ? NotFound() : Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            return ok ? NoContent() : NotFound();
        }
    }
}
