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
    [HasPermission(PermissionCodes.Payments)]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _service;

        public InvoicesController(IInvoiceService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetAll()
        {
            var list = await _service.GetAllAsync();
            return Ok(list);
        }

        [HttpGet("by-membership/{membershipId}")]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetByMembership(int membershipId)
        {
            var list = await _service.GetByMembershipIdAsync(membershipId);
            return Ok(list);
        }

        [HttpGet("by-user/{userId}")]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetByUser(int userId)
        {
            var list = await _service.GetByUserIdAsync(userId);
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceDto>> Get(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpGet("number/{invoiceNumber}")]
        public async Task<ActionResult<InvoiceDto>> GetByNumber(string invoiceNumber)
        {
            var item = await _service.GetByNumberAsync(invoiceNumber);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<InvoiceDto>> Create(CreateInvoiceDto dto)
        {
            var item = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<InvoiceDto>> Update(int id, UpdateInvoiceDto dto)
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

        [HttpPost("{id}/mark-paid")]
        public async Task<ActionResult> MarkAsPaid(int id, [FromBody] MarkAsPaidDto dto)
        {
            var ok = await _service.MarkAsPaidAsync(id, dto.PaymentId);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpGet("{id}/pdf")]
        public async Task<ActionResult> ExportPdf(int id)
        {
            try
            {
                var pdfBytes = await _service.GeneratePdfBytesAsync(id);
                return File(pdfBytes, "application/pdf", $"invoice-{id}.pdf");
            }
            catch (Exception ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("generate-from-membership/{membershipId}")]
        public async Task<ActionResult<InvoiceDto>> GenerateFromMembership(int membershipId, [FromQuery] bool includeUnpaidOnly = true)
        {
            var invoice = await _service.GenerateInvoiceFromMembershipAsync(membershipId, includeUnpaidOnly);
            if (invoice == null) return NotFound();
            return Ok(invoice);
        }
    }

    public class MarkAsPaidDto
    {
        public int PaymentId { get; set; }
    }
}
