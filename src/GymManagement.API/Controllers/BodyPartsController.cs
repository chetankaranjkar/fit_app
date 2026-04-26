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
    public class BodyPartsController : ControllerBase
    {
        private readonly IBodyPartService _bodyPartService;

        public BodyPartsController(IBodyPartService bodyPartService)
        {
            _bodyPartService = bodyPartService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BodyPartDto>>> GetAllBodyParts()
        {
            var bodyParts = await _bodyPartService.GetAllBodyPartsAsync();
            return Ok(bodyParts);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BodyPartDto>> GetBodyPart(int id)
        {
            var bodyPart = await _bodyPartService.GetBodyPartByIdAsync(id);
            if (bodyPart == null)
                return NotFound();
            return Ok(bodyPart);
        }

        [HttpPost]
        public async Task<ActionResult<BodyPartDto>> CreateBodyPart(CreateBodyPartDto createBodyPartDto)
        {
            var bodyPart = await _bodyPartService.CreateBodyPartAsync(createBodyPartDto);
            return CreatedAtAction(nameof(GetBodyPart), new { id = bodyPart.Id }, bodyPart);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<BodyPartDto>> UpdateBodyPart(int id, UpdateBodyPartDto updateDto)
        {
            var bodyPart = await _bodyPartService.UpdateBodyPartAsync(id, updateDto);
            if (bodyPart == null)
                return NotFound();
            return Ok(bodyPart);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBodyPart(int id)
        {
            var result = await _bodyPartService.DeleteBodyPartAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }

        [HttpPut("{id}/camera-position")]
        public async Task<ActionResult<BodyPartDto>> UpdateCameraPosition(int id, UpdateBodyPartCameraPositionDto updateDto)
        {
            var bodyPart = await _bodyPartService.UpdateCameraPositionAsync(id, updateDto);
            if (bodyPart == null)
                return NotFound();
            return Ok(bodyPart);
        }
    }
}

