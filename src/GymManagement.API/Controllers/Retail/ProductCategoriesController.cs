using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Services.Retail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.Retail
{
    [ApiController]
    [Route("api/retail/categories")]
    [Authorize]
    [HasPermission(PermissionCodes.RetailPos)]
    public class ProductCategoriesController : ControllerBase
    {
        private readonly IProductCategoryService _service;

        public ProductCategoriesController(IProductCategoryService service)
        {
            _service = service;
        }

        [HttpGet("tree")]
        public async Task<ActionResult<IReadOnlyList<ProductCategoryDto>>> GetTree(CancellationToken ct)
            => Ok(await _service.GetTreeAsync(ct));

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<ProductCategoryDto>>> GetFlat(CancellationToken ct)
            => Ok(await _service.GetFlatAsync(ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ProductCategoryDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<ProductCategoryDto>> Create([FromBody] CreateProductCategoryDto dto, CancellationToken ct)
        {
            var result = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ProductCategoryDto>> Update(int id, [FromBody] UpdateProductCategoryDto dto, CancellationToken ct)
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
            => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();
    }
}
