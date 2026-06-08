using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.LockerMgmt
{
    public class LockerService : ILockerService
    {
        private readonly ApplicationDbContext _db;

        public LockerService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<LockerDto>> GetAllAsync()
        {
            var list = await _db.Set<Locker>()
                .AsNoTracking()
                .Where(l => !l.IsDeleted)
                .OrderBy(l => l.LockerNumber)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<LockerDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<Locker>().AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<LockerDto> CreateAsync(CreateLockerDto dto)
        {
            var lockerNumber = NormalizeLockerNumber(dto.LockerNumber);
            var size = string.IsNullOrWhiteSpace(dto.Size) ? "Medium" : dto.Size.Trim();
            var status = string.IsNullOrWhiteSpace(dto.Status) ? "AVAILABLE" : dto.Status.Trim();
            var location = dto.Location?.Trim();

            var activeDuplicate = await FindActiveByNumberAsync(lockerNumber);
            if (activeDuplicate != null)
                throw new InvalidOperationException($"Locker number \"{lockerNumber}\" is already in use.");

            var recycled = await _db.Set<Locker>()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => l.IsDeleted && l.LockerNumber == lockerNumber);

            if (recycled != null)
            {
                recycled.IsDeleted = false;
                recycled.Size = size;
                recycled.Status = status;
                recycled.Location = location;
                await _db.SaveChangesAsync();
                return Map(recycled);
            }

            var entity = new Locker
            {
                LockerNumber = lockerNumber,
                Size = size,
                Status = status,
                Location = location
            };
            _db.Set<Locker>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<LockerDto?> UpdateAsync(int id, UpdateLockerDto dto)
        {
            var entity = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);
            if (entity == null) return null;

            if (dto.LockerNumber != null)
            {
                var lockerNumber = NormalizeLockerNumber(dto.LockerNumber);
                await EnsureLockerNumberAvailableAsync(lockerNumber, excludeId: id);
                entity.LockerNumber = lockerNumber;
            }
            if (dto.Size != null) entity.Size = dto.Size;
            if (dto.Status != null) entity.Status = dto.Status;
            if (dto.Location != null) entity.Location = dto.Location;

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null) return false;
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

        private async Task EnsureLockerNumberAvailableAsync(string lockerNumber, int? excludeId = null)
        {
            var duplicate = await FindActiveByNumberAsync(lockerNumber, excludeId);
            if (duplicate != null)
                throw new InvalidOperationException($"Locker number \"{lockerNumber}\" is already in use.");
        }

        private async Task<Locker?> FindActiveByNumberAsync(string lockerNumber, int? excludeId = null)
        {
            var query = _db.Set<Locker>()
                .IgnoreQueryFilters()
                .Where(l => !l.IsDeleted && l.LockerNumber == lockerNumber);

            if (excludeId.HasValue)
                query = query.Where(l => l.Id != excludeId.Value);

            return await query.FirstOrDefaultAsync();
        }

        private static LockerDto Map(Locker l) => new()
        {
            Id = l.Id,
            LockerNumber = l.LockerNumber,
            Size = l.Size,
            Status = l.Status,
            Location = l.Location
        };
    }
}
