using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using GymManagement.API.Attributes;

using GymManagement.Core.Authorization;

using GymManagement.Core.DTOs;

using GymManagement.Core.DTOs.Common;

using GymManagement.Core.Services;

using GymManagement.Domain.Entities;



namespace GymManagement.API.Controllers

{

    [ApiController]

    [Route("api/[controller]")]

    [Authorize]

    [HasPermission(PermissionCodes.Payments)]

    public class UserMembershipsController : ControllerBase

    {

        private readonly IUserMembershipService _service;



        public UserMembershipsController(IUserMembershipService service)

        {

            _service = service;

        }



        [HttpGet]

        public async Task<ActionResult<IEnumerable<UserMembershipDto>>> GetAll()

        {

            var list = await _service.GetAllAsync();

            return Ok(list);

        }



        [HttpGet("paged")]

        public async Task<ActionResult<PagedResultDto<UserMembershipDto>>> GetPaged(

            [FromQuery] int page = 1,

            [FromQuery] int pageSize = 50,

            [FromQuery] string? search = null,

            [FromQuery] MembershipStatus? status = null)

        {

            var safePage = page < 1 ? 1 : page;

            var safePageSize = Math.Clamp(pageSize, 1, 200);

            var result = await _service.GetPagedAsync(safePage, safePageSize, search, status);

            return Ok(result);

        }



        [HttpGet("by-user/{userId}")]

        public async Task<ActionResult<IEnumerable<UserMembershipDto>>> GetByUser(int userId)

        {

            var list = await _service.GetByUserIdAsync(userId);

            return Ok(list);

        }

        [HttpGet("active-conflict/{userId:int}")]

        public async Task<ActionResult<ActiveMembershipConflictDto>> GetActiveConflict(

            int userId,

            [FromQuery] int? excludeMembershipId = null)

        {

            var conflict = await _service.GetActiveMembershipConflictForUserAsync(userId, excludeMembershipId);

            if (conflict == null)

                return NotFound();

            return Ok(conflict);

        }



        [HttpGet("{id}")]

        public async Task<ActionResult<UserMembershipDto>> Get(int id)

        {

            var item = await _service.GetByIdAsync(id);

            if (item == null) return NotFound();

            return Ok(item);

        }



        [HttpPost]

        public async Task<ActionResult<UserMembershipDto>> Create(CreateUserMembershipDto dto)

        {

            var userId = ResolveUserId();

            if (!userId.HasValue) return Unauthorized();

            var conflict = await _service.GetActiveMembershipConflictForUserAsync(dto.UserId);

            if (conflict != null)

                return Conflict(conflict);

            var item = await _service.CreateAsync(dto, userId.Value);

            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);

        }



        [HttpPut("{id}")]

        public async Task<ActionResult<UserMembershipDto>> Update(int id, UpdateUserMembershipDto dto)

        {

            var userId = ResolveUserId();

            if (!userId.HasValue) return Unauthorized();

            var item = await _service.UpdateAsync(id, dto, userId.Value);

            if (item == null) return NotFound();

            return Ok(item);

        }



        /// <summary>Membership records are never deleted. Submit a void request via POST /api/membership-requests.</summary>

        [HttpDelete("{id}")]

        public IActionResult Delete(int id)

        {

            _ = id;

            return BadRequest(new

            {

                success = false,

                message = "Membership deletion is not allowed. Submit a void request.",

            });

        }



        private int? ResolveUserId()

        {

            var raw = User.FindFirstValue(JwtClaimTypes.UserId);

            return int.TryParse(raw, out var id) ? id : null;

        }

    }

}


