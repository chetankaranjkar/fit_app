using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.API.Controllers.LockerMgmt
{
    [ApiController]
    [Route("api/locker-management/lockers")]
    [Authorize]
    public class LockersController : ControllerBase
    {
        private readonly ILockerService _service;

        public LockersController(ILockerService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<LockerDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<ActionResult<LockerDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<LockerDto>> Create(CreateLockerDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsDuplicateLockerNumber(ex))
            {
                return Conflict(new { message = "Locker number is already in use." });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<LockerDto>> Update(int id, UpdateLockerDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return updated == null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex) when (IsDuplicateLockerNumber(ex))
            {
                return Conflict(new { message = "Locker number is already in use." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            return ok ? NoContent() : NotFound();
        }

        private static bool IsDuplicateLockerNumber(DbUpdateException ex)
        {
            for (var current = ex.InnerException; current != null; current = current.InnerException)
            {
                if (current is SqlException sql && (sql.Number == 2601 || sql.Number == 2627))
                    return true;
            }

            return false;
        }
    }
}
