using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.LockerMgmt
{
    [ApiController]
    [Route("api/locker-management/access-logs")]
    [Authorize]
    public class LockerAccessLogsController : ControllerBase
    {
        private readonly ILockerAccessLogService _service;

        public LockerAccessLogsController(ILockerAccessLogService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<LockerAccessLogDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpPost]
        public async Task<ActionResult<LockerAccessLogDto>> Create(CreateLockerAccessLogDto dto)
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
    }
}
