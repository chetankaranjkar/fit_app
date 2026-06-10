namespace GymManagement.Core.DTOs;

public class WorkoutCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public List<WorkoutCategoryWarmupDto> Warmups { get; set; } = new();
    public List<WorkoutCategoryStretchDto> Stretches { get; set; } = new();
}

public class WorkoutCategorySummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int WarmupCount { get; set; }
    public int StretchCount { get; set; }
}

public class WorkoutCategoryWarmupDto
{
    public int Id { get; set; }
    public int WarmupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? BodyPart { get; set; }
    public int DisplayOrder { get; set; }
}

public class WorkoutCategoryStretchDto
{
    public int Id { get; set; }
    public int StretchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? BodyPart { get; set; }
    public int DisplayOrder { get; set; }
}

public class CreateWorkoutCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateWorkoutCategoryDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class CategoryWarmupWriteDto
{
    public int WarmupId { get; set; }
    public int DisplayOrder { get; set; }
}

public class CategoryStretchWriteDto
{
    public int StretchId { get; set; }
    public int DisplayOrder { get; set; }
}

public class SaveCategoryWarmupStretchDto
{
    public List<CategoryWarmupWriteDto> Warmups { get; set; } = new();
    public List<CategoryStretchWriteDto> Stretches { get; set; } = new();
}
