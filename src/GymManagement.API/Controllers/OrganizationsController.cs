using GymManagement.API;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.BranchConsole)]
public sealed class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _organizations;

    public OrganizationsController(IOrganizationService organizations) => _organizations = organizations;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrganizationListDto>>> List(CancellationToken cancellationToken = default)
    {
        var list = await _organizations.ListAsync(cancellationToken).ConfigureAwait(false);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<OrganizationListDto>> Create(
        [FromBody] OrganizationCreateDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var created = await _organizations.CreateAsync(dto, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(List), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
