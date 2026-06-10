using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Mobility;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services;

public sealed class WorkoutCategoryService : IWorkoutCategoryService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly IUnitOfWork _unitOfWork;
    private readonly IWorkoutPlanAuditService _audit;

    public WorkoutCategoryService(IUnitOfWork unitOfWork, IWorkoutPlanAuditService audit)
    {
        _unitOfWork = unitOfWork;
        _audit = audit;
    }

    public async Task<IReadOnlyList<WorkoutCategorySummaryDto>> GetAllAsync()
    {
        var categories = (await _unitOfWork.WorkoutCategories.GetAllAsync()).OrderBy(c => c.Name).ToList();
        var result = new List<WorkoutCategorySummaryDto>();
        foreach (var cat in categories)
        {
            var warmupCount = (await _unitOfWork.WorkoutCategoryWarmups
                .FindAsync(w => w.WorkoutCategoryId == cat.Id && !w.IsDeleted)).Count();
            var stretchCount = (await _unitOfWork.WorkoutCategoryStretches
                .FindAsync(s => s.WorkoutCategoryId == cat.Id && !s.IsDeleted)).Count();
            result.Add(new WorkoutCategorySummaryDto
            {
                Id = cat.Id,
                Name = cat.Name,
                Description = cat.Description,
                IsActive = cat.IsActive,
                WarmupCount = warmupCount,
                StretchCount = stretchCount,
            });
        }

        return result;
    }

    public async Task<WorkoutCategoryDto?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.WorkoutCategories.GetByIdAsync(id);
        if (entity == null) return null;
        return await MapDetailAsync(entity);
    }

    public async Task<WorkoutCategoryDto> CreateAsync(
        CreateWorkoutCategoryDto dto,
        int performedByUserId,
        string performedByUserName)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Category name is required.");

        var entity = new WorkoutCategory
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            IsActive = dto.IsActive,
            CreatedDate = DateTime.UtcNow,
        };

        await _unitOfWork.WorkoutCategories.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        await _audit.LogAsync(
            WorkoutPlanAuditAction.CategoryCreated,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Created workout category \"{entity.Name}\".",
            snapshotJson: JsonSerializer.Serialize(MapSummary(entity, 0, 0), JsonOptions));

        return (await MapDetailAsync(entity))!;
    }

    public async Task<WorkoutCategoryDto?> UpdateAsync(
        int id,
        UpdateWorkoutCategoryDto dto,
        int performedByUserId,
        string performedByUserName)
    {
        var entity = await _unitOfWork.WorkoutCategories.GetByIdAsync(id);
        if (entity == null) return null;

        var before = await MapDetailAsync(entity);

        if (!string.IsNullOrWhiteSpace(dto.Name))
            entity.Name = dto.Name.Trim();
        if (dto.Description != null)
            entity.Description = dto.Description;
        if (dto.IsActive.HasValue)
            entity.IsActive = dto.IsActive.Value;

        entity.UpdatedDate = DateTime.UtcNow;
        _unitOfWork.WorkoutCategories.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        var after = await MapDetailAsync(entity);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.CategoryUpdated,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Updated workout category \"{entity.Name}\".",
            snapshotJson: JsonSerializer.Serialize(new { before, after }, JsonOptions));

        return after;
    }

    public async Task<bool> DeleteAsync(int id, int performedByUserId, string performedByUserName)
    {
        var entity = await _unitOfWork.WorkoutCategories.GetByIdAsync(id);
        if (entity == null) return false;

        var snapshot = await MapDetailAsync(entity);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.CategoryDeleted,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Deleted workout category \"{entity.Name}\".",
            snapshotJson: JsonSerializer.Serialize(snapshot, JsonOptions));

        _unitOfWork.WorkoutCategories.Delete(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<WorkoutCategoryDto?> SaveWarmupStretchAsync(
        int id,
        SaveCategoryWarmupStretchDto dto,
        int performedByUserId,
        string performedByUserName)
    {
        var entity = await _unitOfWork.WorkoutCategories.GetByIdAsync(id);
        if (entity == null) return null;

        WorkoutMobilityValidation.EnsureUniqueIds(dto.Warmups.Select(w => w.WarmupId), "warmups");
        WorkoutMobilityValidation.EnsureUniqueIds(dto.Stretches.Select(s => s.StretchId), "stretches");
        WorkoutMobilityValidation.EnsureUniqueDisplayOrders(dto.Warmups.Select(w => w.DisplayOrder), "category warmup");
        WorkoutMobilityValidation.EnsureUniqueDisplayOrders(dto.Stretches.Select(s => s.DisplayOrder), "category stretch");

        var before = await MapDetailAsync(entity);
        await ReplaceCategoryWarmupsAndStretchesAsync(id, dto.Warmups, dto.Stretches);
        await LogCategoryMobilityChangesAsync(entity, before!, dto, performedByUserId, performedByUserName);
        return await MapDetailAsync(entity);
    }

    public async Task<(List<WorkoutPlanWarmupDto> Warmups, List<WorkoutPlanStretchDto> Stretches)> GetDefaultsAsPlanDtosAsync(int categoryId)
    {
        var detail = await MapDetailAsync(categoryId);
        if (detail == null)
            return ([], []);

        var warmups = detail.Warmups.Select(w => new WorkoutPlanWarmupDto
        {
            Id = w.Id,
            WarmupId = w.WarmupId,
            Name = w.Name,
            Description = w.Description,
            VideoUrl = w.VideoUrl,
            DurationSeconds = w.DurationSeconds,
            BodyPart = w.BodyPart,
            DisplayOrder = w.DisplayOrder,
        }).ToList();

        var stretches = detail.Stretches.Select(s => new WorkoutPlanStretchDto
        {
            Id = s.Id,
            StretchId = s.StretchId,
            Name = s.Name,
            Description = s.Description,
            VideoUrl = s.VideoUrl,
            DurationSeconds = s.DurationSeconds,
            BodyPart = s.BodyPart,
            DisplayOrder = s.DisplayOrder,
        }).ToList();

        return (warmups, stretches);
    }

    private async Task<WorkoutCategoryDto?> MapDetailAsync(int categoryId)
    {
        var entity = await _unitOfWork.WorkoutCategories.GetByIdAsync(categoryId);
        return entity == null ? null : await MapDetailAsync(entity);
    }

    private async Task<WorkoutCategoryDto> MapDetailAsync(WorkoutCategory entity)
    {
        var warmupLinks = (await _unitOfWork.WorkoutCategoryWarmups
            .FindAsync(w => w.WorkoutCategoryId == entity.Id && !w.IsDeleted))
            .OrderBy(w => w.DisplayOrder)
            .ToList();

        var stretchLinks = (await _unitOfWork.WorkoutCategoryStretches
            .FindAsync(s => s.WorkoutCategoryId == entity.Id && !s.IsDeleted))
            .OrderBy(s => s.DisplayOrder)
            .ToList();

        var warmups = new List<WorkoutCategoryWarmupDto>();
        foreach (var link in warmupLinks)
        {
            var warmup = await _unitOfWork.Warmups.GetByIdAsync(link.WarmupId);
            if (warmup == null || !warmup.IsActive) continue;
            warmups.Add(new WorkoutCategoryWarmupDto
            {
                Id = link.Id,
                WarmupId = warmup.Id,
                Name = warmup.Name,
                Description = warmup.Description,
                VideoUrl = warmup.VideoUrl,
                DurationSeconds = warmup.DurationSeconds,
                BodyPart = warmup.BodyPart,
                DisplayOrder = link.DisplayOrder,
            });
        }

        var stretches = new List<WorkoutCategoryStretchDto>();
        foreach (var link in stretchLinks)
        {
            var stretch = await _unitOfWork.Stretches.GetByIdAsync(link.StretchId);
            if (stretch == null || !stretch.IsActive) continue;
            stretches.Add(new WorkoutCategoryStretchDto
            {
                Id = link.Id,
                StretchId = stretch.Id,
                Name = stretch.Name,
                Description = stretch.Description,
                VideoUrl = stretch.VideoUrl,
                DurationSeconds = stretch.DurationSeconds,
                BodyPart = stretch.BodyPart,
                DisplayOrder = link.DisplayOrder,
            });
        }

        return new WorkoutCategoryDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description,
            IsActive = entity.IsActive,
            Warmups = warmups,
            Stretches = stretches,
        };
    }

    private static WorkoutCategorySummaryDto MapSummary(WorkoutCategory entity, int warmupCount, int stretchCount) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        Description = entity.Description,
        IsActive = entity.IsActive,
        WarmupCount = warmupCount,
        StretchCount = stretchCount,
    };

    private async Task ReplaceCategoryWarmupsAndStretchesAsync(
        int categoryId,
        IReadOnlyList<CategoryWarmupWriteDto> warmups,
        IReadOnlyList<CategoryStretchWriteDto> stretches)
    {
        foreach (var link in await _unitOfWork.WorkoutCategoryWarmups.FindAsync(w => w.WorkoutCategoryId == categoryId))
            _unitOfWork.WorkoutCategoryWarmups.Delete(link);

        foreach (var link in await _unitOfWork.WorkoutCategoryStretches.FindAsync(s => s.WorkoutCategoryId == categoryId))
            _unitOfWork.WorkoutCategoryStretches.Delete(link);

        await _unitOfWork.SaveChangesAsync();

        foreach (var item in warmups.OrderBy(w => w.DisplayOrder))
        {
            await _unitOfWork.WorkoutCategoryWarmups.AddAsync(new WorkoutCategoryWarmup
            {
                WorkoutCategoryId = categoryId,
                WarmupId = item.WarmupId,
                DisplayOrder = item.DisplayOrder,
                CreatedDate = DateTime.UtcNow,
            });
        }

        foreach (var item in stretches.OrderBy(s => s.DisplayOrder))
        {
            await _unitOfWork.WorkoutCategoryStretches.AddAsync(new WorkoutCategoryStretch
            {
                WorkoutCategoryId = categoryId,
                StretchId = item.StretchId,
                DisplayOrder = item.DisplayOrder,
                CreatedDate = DateTime.UtcNow,
            });
        }

        await _unitOfWork.SaveChangesAsync();
    }

    private async Task LogCategoryMobilityChangesAsync(
        WorkoutCategory category,
        WorkoutCategoryDto before,
        SaveCategoryWarmupStretchDto after,
        int performedByUserId,
        string performedByUserName)
    {
        var beforeWarmupIds = before.Warmups.Select(w => w.WarmupId).ToHashSet();
        var afterWarmupIds = after.Warmups.Select(w => w.WarmupId).ToHashSet();
        foreach (var warmupId in afterWarmupIds.Except(beforeWarmupIds))
        {
            await _audit.LogAsync(
                WorkoutPlanAuditAction.WarmupAddedToCategory,
                workoutPlanId: null,
                workoutPlanName: category.Name,
                assignedToUserId: null,
                performedByUserId,
                performedByUserName,
                changeDetails: $"Added warmup #{warmupId} to category \"{category.Name}\".");
        }

        foreach (var warmupId in beforeWarmupIds.Except(afterWarmupIds))
        {
            await _audit.LogAsync(
                WorkoutPlanAuditAction.WarmupRemovedFromCategory,
                workoutPlanId: null,
                workoutPlanName: category.Name,
                assignedToUserId: null,
                performedByUserId,
                performedByUserName,
                changeDetails: $"Removed warmup #{warmupId} from category \"{category.Name}\".");
        }

        var beforeStretchIds = before.Stretches.Select(s => s.StretchId).ToHashSet();
        var afterStretchIds = after.Stretches.Select(s => s.StretchId).ToHashSet();
        foreach (var stretchId in afterStretchIds.Except(beforeStretchIds))
        {
            await _audit.LogAsync(
                WorkoutPlanAuditAction.StretchAddedToCategory,
                workoutPlanId: null,
                workoutPlanName: category.Name,
                assignedToUserId: null,
                performedByUserId,
                performedByUserName,
                changeDetails: $"Added stretch #{stretchId} to category \"{category.Name}\".");
        }

        foreach (var stretchId in beforeStretchIds.Except(afterStretchIds))
        {
            await _audit.LogAsync(
                WorkoutPlanAuditAction.StretchRemovedFromCategory,
                workoutPlanId: null,
                workoutPlanName: category.Name,
                assignedToUserId: null,
                performedByUserId,
                performedByUserName,
                changeDetails: $"Removed stretch #{stretchId} from category \"{category.Name}\".");
        }
    }
}
