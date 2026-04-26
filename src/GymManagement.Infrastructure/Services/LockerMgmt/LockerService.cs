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
            var entity = new Locker
            {
                LockerNumber = dto.LockerNumber,
                Size = string.IsNullOrWhiteSpace(dto.Size) ? "Medium" : dto.Size,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "AVAILABLE" : dto.Status,
                Location = dto.Location
            };
            _db.Set<Locker>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<LockerDto?> UpdateAsync(int id, UpdateLockerDto dto)
        {
            var entity = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null) return null;

            if (dto.LockerNumber != null) entity.LockerNumber = dto.LockerNumber;
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
