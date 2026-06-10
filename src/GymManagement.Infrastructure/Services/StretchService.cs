using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class StretchService : IStretchService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IWorkoutPlanAuditService _audit;

    public StretchService(IUnitOfWork unitOfWork, ApplicationDbContext context, IWorkoutPlanAuditService audit)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _audit = audit;
    }

    public async Task<IEnumerable<StretchDto>> GetAllAsync()
    {
        var items = await _unitOfWork.Stretches.GetAllAsync();
        return items.OrderBy(s => s.Name).Select(MapToDto);
    }

    public async Task<PagedStretchesDto> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? difficulty = null,
        string? bodyPart = null,
        bool? isActive = null)
    {
        var query = _context.Stretches.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(s =>
                s.Name.ToLower().Contains(q)
                || (s.Description != null && s.Description.ToLower().Contains(q))
                || (s.BodyPart != null && s.BodyPart.ToLower().Contains(q)));
        }

        if (!string.IsNullOrWhiteSpace(difficulty) && !difficulty.Equals("All", StringComparison.OrdinalIgnoreCase))
            query = query.Where(s => s.DifficultyLevel == difficulty);

        if (!string.IsNullOrWhiteSpace(bodyPart))
            query = query.Where(s => s.BodyPart == bodyPart);

        if (isActive.HasValue)
            query = query.Where(s => s.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedStretchesDto
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<StretchDto?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Stretches.GetByIdAsync(id);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<StretchDto> CreateAsync(CreateStretchDto dto, int performedByUserId, string performedByUserName)
    {
        var entity = new Stretch
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            VideoUrl = dto.VideoUrl,
            DurationSeconds = dto.DurationSeconds,
            DifficultyLevel = dto.DifficultyLevel,
            BodyPart = dto.BodyPart,
            IsActive = dto.IsActive,
            CreatedDate = DateTime.UtcNow,
        };

        await _unitOfWork.Stretches.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        var snapshot = JsonSerializer.Serialize(MapToDto(entity), JsonOptions);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.StretchCreated,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Created stretch \"{entity.Name}\".",
            snapshotJson: snapshot);

        return MapToDto(entity);
    }

    public async Task<StretchDto?> UpdateAsync(int id, UpdateStretchDto dto, int performedByUserId, string performedByUserName)
    {
        var entity = await _unitOfWork.Stretches.GetByIdAsync(id);
        if (entity == null) return null;

        var before = MapToDto(entity);

        if (!string.IsNullOrWhiteSpace(dto.Name))
            entity.Name = dto.Name.Trim();
        if (dto.Description != null)
            entity.Description = dto.Description;
        if (dto.VideoUrl != null)
            entity.VideoUrl = dto.VideoUrl;
        if (dto.DurationSeconds.HasValue)
            entity.DurationSeconds = dto.DurationSeconds.Value;
        if (dto.DifficultyLevel != null)
            entity.DifficultyLevel = dto.DifficultyLevel;
        if (dto.BodyPart != null)
            entity.BodyPart = dto.BodyPart;
        if (dto.IsActive.HasValue)
            entity.IsActive = dto.IsActive.Value;

        entity.UpdatedDate = DateTime.UtcNow;
        _unitOfWork.Stretches.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        var after = MapToDto(entity);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.StretchUpdated,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Updated stretch \"{entity.Name}\".",
            snapshotJson: JsonSerializer.Serialize(new { before, after }, JsonOptions));

        return after;
    }

    public async Task<bool> DeleteAsync(int id, int performedByUserId, string performedByUserName)
    {
        var entity = await _unitOfWork.Stretches.GetByIdAsync(id);
        if (entity == null) return false;

        var snapshot = JsonSerializer.Serialize(MapToDto(entity), JsonOptions);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.StretchDeleted,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Deleted stretch \"{entity.Name}\".",
            snapshotJson: snapshot);

        _unitOfWork.Stretches.Delete(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static StretchDto MapToDto(Stretch entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        Description = entity.Description,
        VideoUrl = entity.VideoUrl,
        DurationSeconds = entity.DurationSeconds,
        DifficultyLevel = entity.DifficultyLevel,
        BodyPart = entity.BodyPart,
        IsActive = entity.IsActive,
    };
}
