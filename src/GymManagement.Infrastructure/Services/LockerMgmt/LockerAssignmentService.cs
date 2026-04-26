using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.LockerMgmt
{
    public class LockerAssignmentService : ILockerAssignmentService
    {
        private readonly ApplicationDbContext _db;

        public LockerAssignmentService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<LockerAssignmentDto>> GetAllAsync()
        {
            var list = await _db.Set<LockerAssignment>()
                .AsNoTracking()
                .Include(a => a.Locker)
                .OrderByDescending(a => a.AssignedDate)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<LockerAssignmentDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<LockerAssignment>()
                .AsNoTracking()
                .Include(a => a.Locker)
                .FirstOrDefaultAsync(a => a.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<LockerAssignmentDto> CreateAsync(CreateLockerAssignmentDto dto)
        {
            var locker = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == dto.LockerId)
                ?? throw new InvalidOperationException("Locker not found.");

            var entity = new LockerAssignment
            {
                LockerId = dto.LockerId,
                MemberName = dto.MemberName,
                AssignedDate = dto.AssignedDate,
                ExpiryDate = dto.ExpiryDate
            };
            _db.Set<LockerAssignment>().Add(entity);

            // Auto-transition the locker to OCCUPIED (unless under maintenance).
            if (locker.Status != "MAINTENANCE")
            {
                locker.Status = "OCCUPIED";
            }

            await _db.SaveChangesAsync();

            entity.Locker = locker;
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<LockerAssignment>()
                .Include(a => a.Locker)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null) return false;

            entity.IsDeleted = true;

            // If this was the last active (non-deleted) assignment on the locker and the
            // locker is not under maintenance, free it back up.
            var stillAssigned = await _db.Set<LockerAssignment>()
                .AnyAsync(a => a.LockerId == entity.LockerId && a.Id != entity.Id && !a.IsDeleted);
            if (!stillAssigned && entity.Locker != null && entity.Locker.Status == "OCCUPIED")
            {
                entity.Locker.Status = "AVAILABLE";
            }

            await _db.SaveChangesAsync();
            return true;
        }

        private static LockerAssignmentDto Map(LockerAssignment a) => new()
        {
            Id = a.Id,
            LockerId = a.LockerId,
            LockerNumber = a.Locker?.LockerNumber ?? string.Empty,
            MemberName = a.MemberName,
            AssignedDate = a.AssignedDate,
            ExpiryDate = a.ExpiryDate
        };
    }
}
