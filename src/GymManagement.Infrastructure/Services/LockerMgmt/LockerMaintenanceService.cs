using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.LockerMgmt
{
    public class LockerMaintenanceService : ILockerMaintenanceService
    {
        private readonly ApplicationDbContext _db;

        public LockerMaintenanceService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<LockerMaintenanceDto>> GetAllAsync()
        {
            var list = await _db.Set<LockerMaintenance>()
                .AsNoTracking()
                .Include(m => m.Locker)
                .OrderByDescending(m => m.ReportedDate)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<LockerMaintenanceDto> CreateAsync(CreateLockerMaintenanceDto dto)
        {
            var locker = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == dto.LockerId)
                ?? throw new InvalidOperationException("Locker not found.");

            var entity = new LockerMaintenance
            {
                LockerId = dto.LockerId,
                Issue = dto.Issue,
                ReportedDate = dto.ReportedDate,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "PENDING" : dto.Status.ToUpperInvariant()
            };
            _db.Set<LockerMaintenance>().Add(entity);

            // Auto-flag the locker as MAINTENANCE while the ticket is PENDING.
            if (entity.Status == "PENDING")
            {
                locker.Status = "MAINTENANCE";
            }

            await _db.SaveChangesAsync();

            entity.Locker = locker;
            return Map(entity);
        }

        public async Task<LockerMaintenanceDto?> UpdateStatusAsync(int id, UpdateMaintenanceStatusDto dto)
        {
            var entity = await _db.Set<LockerMaintenance>()
                .Include(m => m.Locker)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null) return null;

            var next = string.IsNullOrWhiteSpace(dto.Status) ? "PENDING" : dto.Status.ToUpperInvariant();
            entity.Status = next;

            if (entity.Locker != null)
            {
                if (next == "FIXED")
                {
                    // If no other pending maintenance exists, put the locker back into circulation.
                    var stillPending = await _db.Set<LockerMaintenance>()
                        .AnyAsync(m => m.LockerId == entity.LockerId && m.Id != entity.Id && m.Status == "PENDING" && !m.IsDeleted);
                    if (!stillPending && entity.Locker.Status == "MAINTENANCE")
                    {
                        // If there's still an active assignment, restore to OCCUPIED;
                        // otherwise mark AVAILABLE.
                        var hasAssignment = await _db.Set<LockerAssignment>()
                            .AnyAsync(a => a.LockerId == entity.LockerId && !a.IsDeleted);
                        entity.Locker.Status = hasAssignment ? "OCCUPIED" : "AVAILABLE";
                    }
                }
                else if (next == "PENDING")
                {
                    entity.Locker.Status = "MAINTENANCE";
                }
            }

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        private static LockerMaintenanceDto Map(LockerMaintenance m) => new()
        {
            Id = m.Id,
            LockerId = m.LockerId,
            LockerNumber = m.Locker?.LockerNumber ?? string.Empty,
            Issue = m.Issue,
            ReportedDate = m.ReportedDate,
            Status = m.Status
        };
    }
}
