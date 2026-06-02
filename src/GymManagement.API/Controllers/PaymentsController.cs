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
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _service;

        public PaymentsController(IPaymentService service)
        {
            _service = service;
        }

        [HttpGet("paged")]
        public async Task<ActionResult<ApiPagedResponse<PaymentDto>>> GetPaged(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] string? search = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 200);
            var result = await _service.GetPagedAsync(
                safePage, safePageSize, search, fromDate, toDate, sortBy, sortDir);
            return Ok(ApiPagedResponse<PaymentDto>.From(result));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PaymentDto>>> GetAll()
        {
            var list = await _service.GetAllAsync();
            return Ok(list);
        }

        [HttpGet("by-membership/{membershipId}")]
        public async Task<ActionResult<IEnumerable<PaymentDto>>> GetByMembership(int membershipId)
        {
            var list = await _service.GetByMembershipIdAsync(membershipId);
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<PaymentDto>> Create(CreatePaymentDto dto)
        {
            var item = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }

        [HttpPost("{id}/ensure-invoice")]
        public async Task<ActionResult<PaymentDto>> EnsureInvoice(int id)
        {
            var item = await _service.EnsureInvoiceAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PaymentDto>> Update(int id, UpdatePaymentDto dto)
        {
            var item = await _service.UpdateAsync(id, dto);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
