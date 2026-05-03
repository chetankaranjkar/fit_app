using System.Linq;
using GymManagement.API.Services;
using GymManagement.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

[ApiController]
[Route("api/help")]
[Authorize]
public sealed class HelpController : ControllerBase
{
    [HttpGet("tooltips/{helpKey}")]
    [ProducesResponseType(typeof(HelpTooltipDto), StatusCodes.Status200OK)]
    public ActionResult<HelpTooltipDto> GetTooltip([FromRoute] string helpKey)
    {
        var dto = InMemoryHelpContent.TooltipOrDefault(helpKey);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpGet("articles/module/{moduleKey}")]
    [ProducesResponseType(typeof(HelpModuleArticleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<HelpModuleArticleDto> GetModuleArticle([FromRoute] string moduleKey)
    {
        var dto = InMemoryHelpContent.ModuleArticle(moduleKey);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpGet("walkthrough/{moduleKey}")]
    [ProducesResponseType(typeof(HelpWalkthroughDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<HelpWalkthroughDto> GetWalkthrough([FromRoute] string moduleKey)
    {
        var dto = InMemoryHelpContent.Walkthrough(moduleKey);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpGet("categories")]
    [ProducesResponseType(typeof(IReadOnlyList<HelpCategoryDto>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<HelpCategoryDto>> GetCategories() =>
        Ok(InMemoryHelpContent.Categories.OrderBy(c => c.SortOrder).ToList());

    [HttpGet("articles")]
    [ProducesResponseType(typeof(IReadOnlyList<HelpArticleListItemDto>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<HelpArticleListItemDto>> GetArticles(
        [FromQuery] string? category,
        [FromQuery] string? search) =>
        Ok(InMemoryHelpContent.ArticlesByCategory(category, search).ToList());

    [HttpGet("articles/{id}")]
    [ProducesResponseType(typeof(HelpArticleDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<HelpArticleDetailDto> GetArticle([FromRoute] string id)
    {
        var dto = InMemoryHelpContent.ArticleById(id);
        return dto == null ? NotFound() : Ok(dto);
    }
}
