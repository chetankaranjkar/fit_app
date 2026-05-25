using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services;
using GymManagement.Core.Services.PersonalTraining;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.PersonalTraining
{
    [ApiController]
    [Route("api/pt/member-packages")]
    [Authorize]
    public class MemberPtPackagesController : ControllerBase
    {
        private readonly IMemberPtPackageService _service;

        public MemberPtPackagesController(IMemberPtPackageService service) => _service = service;

        [HttpGet]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult> Search([FromQuery] MemberPTPackageFilterDto filter, CancellationToken ct)
            => Ok(await _service.SearchAsync(filter, ct));

        [HttpGet("{id:int}")]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult<MemberPTPackageDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto == null ? NotFound() : Ok(dto);
        }

        [HttpPost("assign")]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult<MemberPTPackageDto>> Assign([FromBody] AssignPTPackageDto dto, CancellationToken ct)
            => Ok(await _service.AssignAsync(dto, ResolveUserId(), ct));

        [HttpPost("{id:int}/payment")]
        [HasPermission(PermissionCodes.Payments)]
        public async Task<ActionResult<MemberPTPackageDto>> RecordPayment(int id, [FromBody] RecordPtPaymentDto body, CancellationToken ct)
        {
            var result = await _service.RecordPaymentAsync(id, body.Amount, ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/freeze")]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult<MemberPTPackageDto>> Freeze(int id, [FromBody] FreezePTPackageDto dto, CancellationToken ct)
        {
            var result = await _service.FreezeAsync(id, dto, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/unfreeze")]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult<MemberPTPackageDto>> Unfreeze(int id, CancellationToken ct)
        {
            var result = await _service.UnfreezeAsync(id, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost("{id:int}/extend")]
        [HasPermission(PermissionCodes.ManagePtPackages)]
        public async Task<ActionResult<MemberPTPackageDto>> Extend(int id, [FromBody] ExtendPTPackageDto dto, CancellationToken ct)
        {
            var result = await _service.ExtendAsync(id, dto, ResolveUserId(), ct);
            return result == null ? NotFound() : Ok(result);
        }

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
