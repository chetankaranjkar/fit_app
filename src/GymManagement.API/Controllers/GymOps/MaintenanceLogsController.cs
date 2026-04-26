using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.GymOps
{
    [ApiController]
    [Route("api/gym-operations/maintenance")]
    [Authorize]
    public class MaintenanceLogsController : ControllerBase
    {
        private readonly IMaintenanceLogService _service;

        public MaintenanceLogsController(IMaintenanceLogService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MaintenanceLogDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<ActionResult<MaintenanceLogDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<MaintenanceLogDto>> Create(CreateMaintenanceLogDto dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            return ok ? NoContent() : NotFound();
        }
    }
}
