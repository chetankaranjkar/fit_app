using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services.LockerMgmt;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.LockerMgmt
{
    public class LockerAccessLogService : ILockerAccessLogService
    {
        private readonly ApplicationDbContext _db;

        public LockerAccessLogService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<LockerAccessLogDto>> GetAllAsync()
        {
            var list = await _db.Set<LockerAccessLog>()
                .AsNoTracking()
                .Include(l => l.Locker)
                .OrderByDescending(l => l.AccessTime)
                .Take(500)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<LockerAccessLogDto> CreateAsync(CreateLockerAccessLogDto dto)
        {
            var locker = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == dto.LockerId)
                ?? throw new InvalidOperationException("Locker not found.");

            var entity = new LockerAccessLog
            {
                LockerId = dto.LockerId,
                MemberName = dto.MemberName,
                Action = string.IsNullOrWhiteSpace(dto.Action) ? "OPEN" : dto.Action.ToUpperInvariant(),
                AccessTime = dto.AccessTime ?? DateTime.UtcNow
            };
            _db.Set<LockerAccessLog>().Add(entity);
            await _db.SaveChangesAsync();

            entity.Locker = locker;
            return Map(entity);
        }

        private static LockerAccessLogDto Map(LockerAccessLog l) => new()
        {
            Id = l.Id,
            LockerId = l.LockerId,
            LockerNumber = l.Locker?.LockerNumber ?? string.Empty,
            MemberName = l.MemberName,
            Action = l.Action,
            AccessTime = l.AccessTime
        };
    }
}
