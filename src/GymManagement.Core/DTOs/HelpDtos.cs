namespace GymManagement.Core.DTOs;

public sealed class HelpTooltipDto
{
    public string HelpKey { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public sealed class HelpModuleArticleDto
{
    public string ModuleKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IReadOnlyList<string> Bullets { get; set; } = Array.Empty<string>();
}

public sealed class WalkthroughStepDto
{
    public int Order { get; set; }
    public string Selector { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public sealed class HelpWalkthroughDto
{
    public string ModuleKey { get; set; } = string.Empty;
    public IReadOnlyList<WalkthroughStepDto> Steps { get; set; } = Array.Empty<WalkthroughStepDto>();
}

public sealed class HelpCategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
}

public sealed class HelpArticleListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
}

public sealed class HelpArticleDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string BodyMarkdown { get; set; } = string.Empty;
}
