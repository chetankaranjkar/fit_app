using GymManagement.Core.DTOs.Supplements;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Core.Supplements;
using GymManagement.Domain.Entities.Supplements;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Supplements;

public class SupplementTrackingService : ISupplementTrackingService
{
    private readonly ApplicationDbContext _context;

    public SupplementTrackingService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> CanAccessMemberSupplementsAsync(
        int requestingUserId,
        int targetUserId,
        bool hasUsersAccess,
        bool hasTrainerAccess,
        CancellationToken cancellationToken = default)
    {
        if (requestingUserId == targetUserId) return true;
        if (hasUsersAccess) return true;
        if (!hasTrainerAccess) return false;

        return await _context.UserInstructors.AsNoTracking()
            .AnyAsync(
                ui => !ui.IsDeleted && ui.UserId == targetUserId &&
                      _context.Trainers.Any(t => t.Id == ui.TrainerId && t.UserId == requestingUserId && !t.IsDeleted),
                cancellationToken);
    }

    public async Task<IReadOnlyList<SupplementMasterDto>> ListMasterAsync(bool activeOnly, CancellationToken cancellationToken = default)
    {
        var query = _context.SupplementMasters.AsNoTracking().Where(s => !s.IsDeleted);
        if (activeOnly) query = query.Where(s => s.IsActive);

        return await query
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Name)
            .Select(MapMasterProjection())
            .ToListAsync(cancellationToken);
    }

    public async Task<SupplementMasterDto?> GetMasterByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.SupplementMasters.AsNoTracking()
            .Where(s => s.Id == id && !s.IsDeleted)
            .Select(MapMasterProjection())
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<SupplementMasterDto> CreateMasterAsync(UpsertSupplementMasterDto dto, CancellationToken cancellationToken = default)
    {
        ValidateMaster(dto);
        await ValidateProductLinkAsync(dto.ProductId, cancellationToken);

        var entity = new SupplementMaster
        {
            Name = dto.Name.Trim(),
            Category = dto.Category.Trim(),
            Description = dto.Description?.Trim(),
            DefaultDosage = dto.DefaultDosage?.Trim(),
            IsActive = dto.IsActive,
            ProductId = dto.ProductId,
            CreatedDate = DateTime.UtcNow,
        };

        _context.SupplementMasters.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return (await GetMasterByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<SupplementMasterDto> UpdateMasterAsync(int id, UpsertSupplementMasterDto dto, CancellationToken cancellationToken = default)
    {
        ValidateMaster(dto);
        await ValidateProductLinkAsync(dto.ProductId, cancellationToken);

        var entity = await _context.SupplementMasters.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Supplement not found.");

        entity.Name = dto.Name.Trim();
        entity.Category = dto.Category.Trim();
        entity.Description = dto.Description?.Trim();
        entity.DefaultDosage = dto.DefaultDosage?.Trim();
        entity.IsActive = dto.IsActive;
        entity.ProductId = dto.ProductId;
        entity.UpdatedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return (await GetMasterByIdAsync(id, cancellationToken))!;
    }

    public async Task DeleteMasterAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SupplementMasters.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Supplement not found.");

        var hasActive = await _context.MemberSupplements.AnyAsync(
            m => !m.IsDeleted && m.SupplementMasterId == id &&
                 m.Status == MemberSupplementStatuses.Active,
            cancellationToken);

        if (hasActive)
            throw new InvalidOperationException("Cannot delete supplement with active member assignments.");

        entity.IsDeleted = true;
        entity.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MemberSupplementDto>> GetByUserIdAsync(int userId, bool activeOnly, CancellationToken cancellationToken = default)
    {
        await EnsureUserExistsAsync(userId, cancellationToken);

        var list = await LoadMemberSupplementQuery()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.StartDate)
            .ToListAsync(cancellationToken);

        return list
            .Select(MapMemberDto)
            .Where(m => !activeOnly || m.IsCurrentlyActive)
            .ToList();
    }

    public async Task<IReadOnlyList<MemberSupplementDto>> GetHistoryByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        await EnsureUserExistsAsync(userId, cancellationToken);

        var list = await LoadMemberSupplementQuery()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.StartDate)
            .ToListAsync(cancellationToken);

        return list.Select(MapMemberDto).ToList();
    }

    public async Task<MemberSupplementDto> AssignAsync(CreateMemberSupplementDto dto, int assignedByUserId, CancellationToken cancellationToken = default)
    {
        await EnsureUserExistsAsync(dto.UserId, cancellationToken);
        ValidateAssignment(dto.Timing, dto.Dosage, dto.StartDate, dto.EndDate);

        var master = await _context.SupplementMasters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == dto.SupplementMasterId && !s.IsDeleted && s.IsActive, cancellationToken)
            ?? throw new NotFoundException("Supplement master not found or inactive.");

        var productId = dto.ProductId ?? master.ProductId;
        await ValidateProductLinkAsync(productId, cancellationToken);

        var entity = new MemberSupplement
        {
            UserId = dto.UserId,
            SupplementMasterId = dto.SupplementMasterId,
            Dosage = dto.Dosage.Trim(),
            Timing = dto.Timing.Trim(),
            StartDate = dto.StartDate.Date,
            EndDate = dto.EndDate?.Date,
            Notes = dto.Notes?.Trim(),
            AssignedByUserId = assignedByUserId,
            Status = MemberSupplementStatuses.Active,
            ProductId = productId,
            CreatedDate = DateTime.UtcNow,
        };

        _context.MemberSupplements.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var projection = await LoadMemberSupplementQuery()
            .Where(m => m.Id == entity.Id)
            .Select(MapMemberProjection())
            .FirstAsync(cancellationToken);

        return MapMemberDtoFromProjection(projection);
    }

    public async Task<int?> GetAssignmentUserIdAsync(int assignmentId, CancellationToken cancellationToken = default)
    {
        return await _context.MemberSupplements.AsNoTracking()
            .Where(m => m.Id == assignmentId && !m.IsDeleted)
            .Select(m => (int?)m.UserId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<MemberSupplementDto> UpdateAssignmentAsync(int id, UpdateMemberSupplementDto dto, CancellationToken cancellationToken = default)
    {
        ValidateAssignment(dto.Timing, dto.Dosage, dto.StartDate, dto.EndDate);
        if (!MemberSupplementStatuses.All.Contains(dto.Status))
            throw new ArgumentException("Invalid supplement status.");

        var entity = await _context.MemberSupplements
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Member supplement assignment not found.");

        await ValidateProductLinkAsync(dto.ProductId, cancellationToken);

        entity.Dosage = dto.Dosage.Trim();
        entity.Timing = dto.Timing.Trim();
        entity.StartDate = dto.StartDate.Date;
        entity.EndDate = dto.EndDate?.Date;
        entity.Notes = dto.Notes?.Trim();
        entity.Status = ResolveStatus(dto.Status, dto.EndDate);
        entity.ProductId = dto.ProductId;
        entity.UpdatedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var projection = await LoadMemberSupplementQuery()
            .Where(m => m.Id == id)
            .Select(MapMemberProjection())
            .FirstAsync(cancellationToken);

        return MapMemberDtoFromProjection(projection);
    }

    public async Task<SupplementAnalyticsDto> GetAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var assignments = await _context.MemberSupplements.AsNoTracking()
            .Where(m => !m.IsDeleted)
            .Select(m => new
            {
                m.UserId,
                m.SupplementMasterId,
                MasterName = m.SupplementMaster.Name,
                m.SupplementMaster.Category,
                m.Status,
                m.EndDate,
                m.StartDate,
            })
            .ToListAsync(cancellationToken);

        static bool IsActiveRow(string status, DateTime start, DateTime? end, DateTime todayUtc) =>
            status == MemberSupplementStatuses.Active &&
            start <= todayUtc &&
            (end == null || end >= todayUtc);

        var active = assignments.Where(a => IsActiveRow(a.Status, a.StartDate, a.EndDate, today)).ToList();

        var mostAssigned = assignments
            .GroupBy(a => new { a.SupplementMasterId, a.MasterName, a.Category })
            .Select(g => new SupplementAssignmentStatDto
            {
                SupplementMasterId = g.Key.SupplementMasterId,
                Name = g.Key.MasterName,
                Category = g.Key.Category,
                AssignmentCount = g.Count(),
                ActiveCount = g.Count(a => IsActiveRow(a.Status, a.StartDate, a.EndDate, today)),
            })
            .OrderByDescending(x => x.AssignmentCount)
            .Take(10)
            .ToList();

        var categoryUsage = active
            .GroupBy(a => a.Category)
            .Select(g => new SupplementCategoryStatDto
            {
                Category = g.Key,
                ActiveAssignments = g.Count(),
                TotalAssignments = assignments.Count(a => a.Category == g.Key),
            })
            .OrderByDescending(x => x.ActiveAssignments)
            .ToList();

        return new SupplementAnalyticsDto
        {
            MostAssigned = mostAssigned,
            ActiveSupplementUsers = active.Select(a => a.UserId).Distinct().Count(),
            TotalActiveAssignments = active.Count,
            CategoryUsage = categoryUsage,
        };
    }

    private static void ValidateMaster(UpsertSupplementMasterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Supplement name is required.");
        if (!SupplementCategories.All.Contains(dto.Category))
            throw new ArgumentException("Invalid supplement category.");
    }

    private static void ValidateAssignment(string timing, string dosage, DateTime start, DateTime? end)
    {
        if (string.IsNullOrWhiteSpace(dosage))
            throw new ArgumentException("Dosage is required.");
        if (!SupplementTimingOptions.All.Contains(timing))
            throw new ArgumentException("Invalid supplement timing.");
        if (end.HasValue && end.Value.Date < start.Date)
            throw new ArgumentException("End date cannot be before start date.");
    }

    private async Task ValidateProductLinkAsync(int? productId, CancellationToken cancellationToken)
    {
        if (productId == null) return;
        var exists = await _context.RetailProducts.AsNoTracking()
            .AnyAsync(p => p.Id == productId && !p.IsDeleted, cancellationToken);
        if (!exists) throw new NotFoundException("Linked retail product not found.");
    }

    private async Task EnsureUserExistsAsync(int userId, CancellationToken cancellationToken)
    {
        var exists = await _context.Users.AsNoTracking()
            .AnyAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);
        if (!exists) throw new NotFoundException("Member not found.");
    }

    private static string ResolveStatus(string requested, DateTime? endDate)
    {
        if (requested != MemberSupplementStatuses.Active) return requested;
        if (endDate.HasValue && endDate.Value.Date < DateTime.UtcNow.Date)
            return MemberSupplementStatuses.Expired;
        return MemberSupplementStatuses.Active;
    }

    private IQueryable<MemberSupplement> LoadMemberSupplementQuery() =>
        _context.MemberSupplements.AsNoTracking()
            .Include(m => m.SupplementMaster)
            .Include(m => m.User)
            .Include(m => m.AssignedByUser)
            .Include(m => m.Product)
            .Where(m => !m.IsDeleted);

    private static System.Linq.Expressions.Expression<Func<SupplementMaster, SupplementMasterDto>> MapMasterProjection() =>
        s => new SupplementMasterDto
        {
            Id = s.Id,
            Name = s.Name,
            Category = s.Category,
            Description = s.Description,
            DefaultDosage = s.DefaultDosage,
            IsActive = s.IsActive,
            ProductId = s.ProductId,
            ProductName = s.Product != null ? s.Product.Name : null,
            ProductSku = s.Product != null ? s.Product.Sku : null,
        };

    private sealed class MemberSupplementProjection
    {
        public int Id { get; init; }
        public int UserId { get; init; }
        public string MemberFirstName { get; init; } = "";
        public string MemberLastName { get; init; } = "";
        public int SupplementMasterId { get; init; }
        public string SupplementName { get; init; } = "";
        public string Category { get; init; } = "";
        public string? MasterDescription { get; init; }
        public string Dosage { get; init; } = "";
        public string Timing { get; init; } = "";
        public DateTime StartDate { get; init; }
        public DateTime? EndDate { get; init; }
        public string? Notes { get; init; }
        public int? AssignedByUserId { get; init; }
        public string? AssignedByFirstName { get; init; }
        public string? AssignedByLastName { get; init; }
        public string Status { get; init; } = "";
        public int? ProductId { get; init; }
        public string? ProductName { get; init; }
    }

    private static System.Linq.Expressions.Expression<Func<MemberSupplement, MemberSupplementProjection>> MapMemberProjection() =>
        m => new MemberSupplementProjection
        {
            Id = m.Id,
            UserId = m.UserId,
            MemberFirstName = m.User.FirstName,
            MemberLastName = m.User.LastName,
            SupplementMasterId = m.SupplementMasterId,
            SupplementName = m.SupplementMaster.Name,
            Category = m.SupplementMaster.Category,
            MasterDescription = m.SupplementMaster.Description,
            Dosage = m.Dosage,
            Timing = m.Timing,
            StartDate = m.StartDate,
            EndDate = m.EndDate,
            Notes = m.Notes,
            AssignedByUserId = m.AssignedByUserId,
            AssignedByFirstName = m.AssignedByUser != null ? m.AssignedByUser.FirstName : null,
            AssignedByLastName = m.AssignedByUser != null ? m.AssignedByUser.LastName : null,
            Status = m.Status,
            ProductId = m.ProductId,
            ProductName = m.Product != null ? m.Product.Name : m.SupplementMaster.Product != null ? m.SupplementMaster.Product.Name : null,
        };

    private static MemberSupplementDto MapMemberDto(MemberSupplement m)
    {
        var projection = new MemberSupplementProjection
        {
            Id = m.Id,
            UserId = m.UserId,
            MemberFirstName = m.User.FirstName,
            MemberLastName = m.User.LastName,
            SupplementMasterId = m.SupplementMasterId,
            SupplementName = m.SupplementMaster.Name,
            Category = m.SupplementMaster.Category,
            MasterDescription = m.SupplementMaster.Description,
            Dosage = m.Dosage,
            Timing = m.Timing,
            StartDate = m.StartDate,
            EndDate = m.EndDate,
            Notes = m.Notes,
            AssignedByUserId = m.AssignedByUserId,
            AssignedByFirstName = m.AssignedByUser?.FirstName,
            AssignedByLastName = m.AssignedByUser?.LastName,
            Status = m.Status,
            ProductId = m.ProductId,
            ProductName = m.Product?.Name ?? m.SupplementMaster.Product?.Name,
        };
        return MapMemberDtoFromProjection(projection);
    }

    private static MemberSupplementDto MapMemberDtoFromProjection(MemberSupplementProjection p)
    {
        var today = DateTime.UtcNow.Date;
        var effectiveStatus = p.Status;
        if (effectiveStatus == MemberSupplementStatuses.Active &&
            p.EndDate.HasValue && p.EndDate.Value.Date < today)
            effectiveStatus = MemberSupplementStatuses.Expired;

        var isActive = effectiveStatus == MemberSupplementStatuses.Active &&
                       p.StartDate.Date <= today &&
                       (!p.EndDate.HasValue || p.EndDate.Value.Date >= today);

        int? daysRemaining = null;
        if (isActive && p.EndDate.HasValue)
            daysRemaining = (p.EndDate.Value.Date - today).Days;

        var instructions = string.Join(" · ", new[]
        {
            $"Take {p.Dosage}",
            SupplementTimingOptions.GetLabel(p.Timing),
            p.Notes,
        }.Where(x => !string.IsNullOrWhiteSpace(x)));

        return new MemberSupplementDto
        {
            Id = p.Id,
            UserId = p.UserId,
            MemberName = $"{p.MemberFirstName} {p.MemberLastName}".Trim(),
            SupplementMasterId = p.SupplementMasterId,
            SupplementName = p.SupplementName,
            Category = p.Category,
            Dosage = p.Dosage,
            Timing = p.Timing,
            TimingLabel = SupplementTimingOptions.GetLabel(p.Timing),
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            Notes = p.Notes,
            AssignedByUserId = p.AssignedByUserId,
            AssignedByName = p.AssignedByFirstName != null
                ? $"{p.AssignedByFirstName} {p.AssignedByLastName}".Trim()
                : null,
            Status = effectiveStatus,
            IsCurrentlyActive = isActive,
            ProductId = p.ProductId,
            ProductName = p.ProductName,
            Instructions = instructions,
            DaysRemaining = daysRemaining,
            CompliancePercent = isActive ? 100 : null,
        };
    }
}
