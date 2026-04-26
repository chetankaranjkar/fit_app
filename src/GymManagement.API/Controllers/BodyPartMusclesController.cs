using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class BodyPartMusclesController : ControllerBase
    {
        private readonly IBodyPartMuscleService _service;

        public BodyPartMusclesController(IBodyPartMuscleService service)
        {
            _service = service;
        }

        [HttpGet("by-body-part/{bodyPartId}")]
        public async Task<ActionResult<IEnumerable<BodyPartMuscleDto>>> GetByBodyPartId(int bodyPartId)
        {
            var muscles = await _service.GetByBodyPartIdAsync(bodyPartId);
            return Ok(muscles);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BodyPartMuscleDto>> GetById(int id)
        {
            var muscle = await _service.GetByIdAsync(id);
            if (muscle == null)
                return NotFound();
            return Ok(muscle);
        }

        [HttpPost]
        public async Task<ActionResult<BodyPartMuscleDto>> Create(CreateBodyPartMuscleDto dto)
        {
            var muscle = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = muscle.Id }, muscle);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<BodyPartMuscleDto>> Update(int id, UpdateBodyPartMuscleDto dto)
        {
            var muscle = await _service.UpdateAsync(id, dto);
            if (muscle == null)
                return NotFound();
            return Ok(muscle);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}
