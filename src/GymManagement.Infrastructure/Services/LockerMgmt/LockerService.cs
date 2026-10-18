using GymManagement.Core.Branching;
using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services;
using GymManagement.Core.Services.LockerMgmt;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.LockerMgmt
{
    public class LockerService : ILockerService
    {
        private readonly ApplicationDbContext _db;
        private readonly IBranchScopeService _scope;

        public LockerService(ApplicationDbContext db, IBranchScopeService scope)
        {
            _db = db;
            _scope = scope;
        }

        public async Task<IEnumerable<LockerDto>> GetAllAsync()
        {
            var scope = await _scope.CurrentAsync();
            var list = await _db.Set<Locker>()
                .AsNoTracking()
                .Where(l => !l.IsDeleted)
                .OrderBy(l => l.LockerNumber)
                .ToListAsync();
            return list.Where(l => scope.Includes(l.BranchId)).Select(Map);
        }

        public async Task<LockerDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<Locker>().AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null || !(await _scope.CurrentAsync()).Includes(entity.BranchId))
                return null;
            return Map(entity);
        }

        public async Task<LockerDto> CreateAsync(CreateLockerDto dto)
        {
            var lockerNumber = NormalizeLockerNumber(dto.LockerNumber);
            var size = string.IsNullOrWhiteSpace(dto.Size) ? "Medium" : dto.Size.Trim();
            var status = string.IsNullOrWhiteSpace(dto.Status) ? "AVAILABLE" : dto.Status.Trim();
            var location = dto.Location?.Trim();

            var activeDuplicate = await FindActiveByNumberAsync(lockerNumber, dto.BranchId);
            if (activeDuplicate != null)
                throw new InvalidOperationException($"Locker number \"{lockerNumber}\" is already in use at this branch.");

            var recycled = await _db.Set<Locker>()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => l.IsDeleted && l.LockerNumber == lockerNumber && l.BranchId == dto.BranchId);

            if (recycled != null)
            {
                recycled.IsDeleted = false;
                recycled.Size = size;
                recycled.Status = status;
                recycled.Location = location;
                recycled.BranchId = (await _scope.RequireAssignableBranchAsync(dto.BranchId, null)).BranchId;
                await _db.SaveChangesAsync();
                return Map(recycled);
            }

            var entity = new Locker
            {
                LockerNumber = lockerNumber,
                Size = size,
                Status = status,
                Location = location,
                BranchId = (await _scope.RequireAssignableBranchAsync(dto.BranchId, null)).BranchId
            };
            _db.Set<Locker>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<LockerDto?> UpdateAsync(int id, UpdateLockerDto dto)
        {
            var entity = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);
            if (entity == null || !(await _scope.CurrentAsync()).Includes(entity.BranchId)) return null;

            if (dto.LockerNumber != null)
            {
                var lockerNumber = NormalizeLockerNumber(dto.LockerNumber);
                var branchId = dto.BranchId ?? entity.BranchId;
                await EnsureLockerNumberAvailableAsync(lockerNumber, branchId, excludeId: id);
                entity.LockerNumber = lockerNumber;
            }
            if (dto.BranchId.HasValue && dto.BranchId != entity.BranchId)
                throw new InvalidOperationException("Move a locker with an audited transfer. Editing the locker does not change its branch or past assignments.");
            if (dto.Size != null) entity.Size = dto.Size;
            if (dto.Status != null) entity.Status = dto.Status;
            if (dto.Location != null) entity.Location = dto.Location;

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null || !(await _scope.CurrentAsync()).Includes(entity.BranchId)) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        private static string NormalizeLockerNumber(string? value)
        {
            var normalized = value?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(normalized))
                throw new InvalidOperationException("Locker number is required.");
            return normalized;
        }

        private async Task EnsureLockerNumberAvailableAsync(string lockerNumber, int? branchId, int? excludeId = null)
        {
            var duplicate = await FindActiveByNumberAsync(lockerNumber, branchId, excludeId);
            if (duplicate != null)
                throw new InvalidOperationException($"Locker number \"{lockerNumber}\" is already in use at this branch.");
        }

        private async Task<Locker?> FindActiveByNumberAsync(string lockerNumber, int? branchId, int? excludeId = null)
        {
            var candidates = await _db.Set<Locker>()
                .IgnoreQueryFilters()
                .Where(l => !l.IsDeleted && l.LockerNumber == lockerNumber)
                .ToListAsync();
            return candidates.FirstOrDefault(l =>
                (excludeId == null || l.Id != excludeId) &&
                OperationalBranchRules.LockerNumbersCollide(l.BranchId, l.LockerNumber, branchId, lockerNumber));
        }

        private static LockerDto Map(Locker l) => new()
        {
            Id = l.Id,
            LockerNumber = l.LockerNumber,
            Size = l.Size,
            Status = l.Status,
            Location = l.Location,
            BranchId = l.BranchId
        };
    }
}
