using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.TrainerAccess)]
    public class UserDietPlansController : ControllerBase
    {
        private readonly IUserDietPlanService _service;

        public UserDietPlansController(IUserDietPlanService service)
        {
            _service = service;
        }

        /// <summary>Get assignments. Optional: ?userId= & ?dietPlanId=</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDietPlanDto>>> GetAssignments(
            [FromQuery] int? userId,
            [FromQuery] int? dietPlanId)
        {
            var list = await _service.GetAssignmentsAsync(userId, dietPlanId);
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserDietPlanDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<UserDietPlanDto>> Assign(CreateUserDietPlanDto dto)
        {
            var item = await _service.AssignAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Unassign(int id)
        {
            var ok = await _service.UnassignAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
