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
    [Route("api/retail/products")]
    [Authorize]
    [HasPermission(PermissionCodes.RetailPos)]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _service;

        public ProductsController(IProductService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<ProductDto>>> Search([FromQuery] ProductSearchFilterDto filter, CancellationToken ct)
            => Ok(await _service.SearchAsync(filter, ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ProductDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpGet("by-sku/{sku}")]
        public async Task<ActionResult<ProductDto>> GetBySku(string sku, CancellationToken ct)
        {
            var dto = await _service.GetBySkuAsync(sku, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpGet("by-barcode/{barcode}")]
        public async Task<ActionResult<ProductDto>> GetByBarcode(string barcode, CancellationToken ct)
        {
            var dto = await _service.GetByBarcodeAsync(barcode, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductDto dto, CancellationToken ct)
        {
            var result = await _service.CreateAsync(dto, ResolveUserId(), ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ProductDto>> Update(int id, [FromBody] UpdateProductDto dto, CancellationToken ct)
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
            => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
