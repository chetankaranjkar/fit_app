using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.Payments)]
    public class CouponsController : ControllerBase
    {
        private readonly ICouponService _service;

        public CouponsController(ICouponService service)
        {
            _service = service;
        }

        /// <summary>List all coupons with optional search and status filter.</summary>
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<CouponDto>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? status,
            CancellationToken ct)
        {
            var list = await _service.GetAllAsync(search, status, ct);
            return Ok(list);
        }

        /// <summary>Get coupon by ID.</summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CouponDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        /// <summary>Create a new coupon.</summary>
        [HttpPost]
        public async Task<ActionResult<CouponDto>> Create([FromBody] CreateCouponDto dto, CancellationToken ct)
        {
            var staffId = ResolveUserId();
            var result = await _service.CreateAsync(dto, staffId, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>Update an existing coupon.</summary>
        [HttpPut("{id:int}")]
        public async Task<ActionResult<CouponDto>> Update(int id, [FromBody] UpdateCouponDto dto, CancellationToken ct)
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            return result == null ? NotFound() : Ok(result);
        }

        /// <summary>Disable (soft-delete) a coupon.</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Disable(int id, CancellationToken ct)
        {
            var ok = await _service.DisableAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        /// <summary>Validate a coupon code for a given payment context.</summary>
        [HttpPost("validate")]
        public async Task<ActionResult<ValidateCouponResponse>> Validate([FromBody] ValidateCouponRequest request, CancellationToken ct)
        {
            var result = await _service.ValidateAsync(request, ct);
            return Ok(result);
        }

        /// <summary>Get usage history for a coupon.</summary>
        [HttpGet("{id:int}/usages")]
        public async Task<ActionResult<IReadOnlyList<CouponUsageDto>>> GetUsages(int id, CancellationToken ct)
        {
            var list = await _service.GetUsagesAsync(id, ct);
            return Ok(list);
        }

        /// <summary>Get coupon analytics dashboard data.</summary>
        [HttpGet("analytics")]
        public async Task<ActionResult<CouponAnalyticsDto>> Analytics(CancellationToken ct)
        {
            var data = await _service.GetAnalyticsAsync(ct);
            return Ok(data);
        }

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
