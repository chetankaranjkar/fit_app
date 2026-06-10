namespace GymManagement.Core.DTOs;

public class WarmupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public int? CaloriesBurn { get; set; }
    public bool IsActive { get; set; }
}

public class CreateWarmupDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public int? CaloriesBurn { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateWarmupDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public int? CaloriesBurn { get; set; }
    public bool? IsActive { get; set; }
}

public class PagedWarmupsDto
{
    public List<WarmupDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class WorkoutPlanWarmupDto
{
    public int Id { get; set; }
    public int WarmupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? BodyPart { get; set; }
    public int? CaloriesBurn { get; set; }
    public int DisplayOrder { get; set; }
}

public class PlanWarmupWriteDto
{
    public int WarmupId { get; set; }
    public int DisplayOrder { get; set; }
}
