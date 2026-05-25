using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/packages")]
    [Authorize]
    [HasPermission(PermissionCodes.ManagePtPackages)]
    public class PtPackagesController : ControllerBase
    {
        private readonly IPtPackageService _service;

        public PtPackagesController(IPtPackageService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult> Search([FromQuery] PTPackageFilterDto filter, CancellationToken ct)
            => Ok(await _service.SearchAsync(filter, ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<PTPackageDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<PTPackageDto>> Create([FromBody] CreatePTPackageDto dto, CancellationToken ct)
        {
            var result = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<PTPackageDto>> Update(int id, [FromBody] UpdatePTPackageDto dto, CancellationToken ct)
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
            => await _service.DeleteAsync(id, ct) ? NoContent() : NotFound();
    }
}
