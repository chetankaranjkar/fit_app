using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class WarmupService : IWarmupService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IWorkoutPlanAuditService _audit;

    public WarmupService(IUnitOfWork unitOfWork, ApplicationDbContext context, IWorkoutPlanAuditService audit)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _audit = audit;
    }

    public async Task<IEnumerable<WarmupDto>> GetAllAsync()
    {
        var items = await _unitOfWork.Warmups.GetAllAsync();
        return items.OrderBy(w => w.Name).Select(MapToDto);
    }

    public async Task<PagedWarmupsDto> GetPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        string? difficulty = null,
        string? bodyPart = null,
        bool? isActive = null)
    {
        var query = _context.Warmups.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(w =>
                w.Name.ToLower().Contains(q)
                || (w.Description != null && w.Description.ToLower().Contains(q))
                || (w.BodyPart != null && w.BodyPart.ToLower().Contains(q)));
        }

        if (!string.IsNullOrWhiteSpace(difficulty) && !difficulty.Equals("All", StringComparison.OrdinalIgnoreCase))
            query = query.Where(w => w.DifficultyLevel == difficulty);

        if (!string.IsNullOrWhiteSpace(bodyPart))
            query = query.Where(w => w.BodyPart == bodyPart);

        if (isActive.HasValue)
            query = query.Where(w => w.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(w => w.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedWarmupsDto
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<WarmupDto?> GetByIdAsync(int id)
    {
        var entity = await _unitOfWork.Warmups.GetByIdAsync(id);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<WarmupDto> CreateAsync(CreateWarmupDto dto, int performedByUserId, string performedByUserName)
    {
        var entity = new Warmup
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            VideoUrl = dto.VideoUrl,
            DurationSeconds = dto.DurationSeconds,
            DifficultyLevel = dto.DifficultyLevel,
            BodyPart = dto.BodyPart,
            CaloriesBurn = dto.CaloriesBurn,
            IsActive = dto.IsActive,
            CreatedDate = DateTime.UtcNow,
        };

        await _unitOfWork.Warmups.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        var snapshot = JsonSerializer.Serialize(MapToDto(entity), JsonOptions);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.WarmupCreated,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Created warmup \"{entity.Name}\".",
            snapshotJson: snapshot);

        return MapToDto(entity);
    }

    public async Task<WarmupDto?> UpdateAsync(int id, UpdateWarmupDto dto, int performedByUserId, string performedByUserName)
    {
        var entity = await _unitOfWork.Warmups.GetByIdAsync(id);
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
        if (dto.CaloriesBurn.HasValue)
            entity.CaloriesBurn = dto.CaloriesBurn;
        if (dto.IsActive.HasValue)
            entity.IsActive = dto.IsActive.Value;

        entity.UpdatedDate = DateTime.UtcNow;
        _unitOfWork.Warmups.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        var after = MapToDto(entity);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.WarmupUpdated,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Updated warmup \"{entity.Name}\".",
            snapshotJson: JsonSerializer.Serialize(new { before, after }, JsonOptions));

        return after;
    }

    public async Task<bool> DeleteAsync(int id, int performedByUserId, string performedByUserName)
    {
        var entity = await _unitOfWork.Warmups.GetByIdAsync(id);
        if (entity == null) return false;

        var snapshot = JsonSerializer.Serialize(MapToDto(entity), JsonOptions);
        await _audit.LogAsync(
            WorkoutPlanAuditAction.WarmupDeleted,
            workoutPlanId: null,
            workoutPlanName: entity.Name,
            assignedToUserId: null,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Deleted warmup \"{entity.Name}\".",
            snapshotJson: snapshot);

        _unitOfWork.Warmups.Delete(entity);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static WarmupDto MapToDto(Warmup entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        Description = entity.Description,
        VideoUrl = entity.VideoUrl,
        DurationSeconds = entity.DurationSeconds,
        DifficultyLevel = entity.DifficultyLevel,
        BodyPart = entity.BodyPart,
        CaloriesBurn = entity.CaloriesBurn,
        IsActive = entity.IsActive,
    };
}
