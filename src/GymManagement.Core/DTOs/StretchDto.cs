namespace GymManagement.Core.DTOs;

public class StretchDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public bool IsActive { get; set; }
}

public class CreateStretchDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateStretchDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public bool? IsActive { get; set; }
}

public class PagedStretchesDto
{
    public List<StretchDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class WorkoutPlanStretchDto
{
    public int Id { get; set; }
    public int StretchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public int DisplayOrder { get; set; }
}

public class PlanStretchWriteDto
{
    public int StretchId { get; set; }
    public int DisplayOrder { get; set; }
}

public class SavePlanWarmupStretchDto
{
    public List<PlanWarmupWriteDto> Warmups { get; set; } = new();
    public List<PlanStretchWriteDto> Stretches { get; set; } = new();
}
