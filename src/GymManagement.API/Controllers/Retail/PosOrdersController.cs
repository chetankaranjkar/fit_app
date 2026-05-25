using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Services;
using GymManagement.Core.Services.Retail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.Retail
{
    [ApiController]
    [Route("api/retail/pos")]
    [Authorize]
    [HasPermission(PermissionCodes.RetailPos)]
    public class PosOrdersController : ControllerBase
    {
        private readonly IPosOrderService _service;

        public PosOrdersController(IPosOrderService service)
        {
            _service = service;
        }

        [HttpGet("orders")]
        public async Task<ActionResult<IReadOnlyList<PosOrderDto>>> GetAll(
            [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
            => Ok(await _service.GetAllAsync(from, to, ct));

        [HttpGet("orders/{id:int}")]
        public async Task<ActionResult<PosOrderDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost("orders")]
        public async Task<ActionResult<PosOrderDto>> Create([FromBody] CreatePosOrderDto dto, CancellationToken ct)
        {
            var result = await _service.CreateOrderAsync(dto, ResolveUserId(), ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPost("orders/{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id, CancellationToken ct)
            => await _service.CancelAsync(id, ResolveUserId(), ct) ? NoContent() : NotFound();

        [HttpGet("dashboard")]
        public async Task<ActionResult<PosDashboardDto>> Dashboard(CancellationToken ct)
            => Ok(await _service.GetDashboardAsync(ct));

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
