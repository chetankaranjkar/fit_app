using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.LockerMgmt
{
    [ApiController]
    [Route("api/locker-management/maintenance")]
    [Authorize]
    public class LockerMaintenanceController : ControllerBase
    {
        private readonly ILockerMaintenanceService _service;

        public LockerMaintenanceController(ILockerMaintenanceService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<LockerMaintenanceDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpPost]
        public async Task<ActionResult<LockerMaintenanceDto>> Create(CreateLockerMaintenanceDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return Ok(created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<ActionResult<LockerMaintenanceDto>> UpdateStatus(int id, UpdateMaintenanceStatusDto dto)
        {
            var updated = await _service.UpdateStatusAsync(id, dto);
            return updated == null ? NotFound() : Ok(updated);
        }
    }
}
