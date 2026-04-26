using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.GymOps
{
    public class MaintenanceLogService : IMaintenanceLogService
    {
        private readonly ApplicationDbContext _db;

        public MaintenanceLogService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<MaintenanceLogDto>> GetAllAsync()
        {
            var list = await _db.Set<MaintenanceLog>()
                .AsNoTracking()
                .Include(m => m.Equipment)
                .OrderByDescending(m => m.PerformedAt)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<MaintenanceLogDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<MaintenanceLog>()
                .AsNoTracking()
                .Include(m => m.Equipment)
                .FirstOrDefaultAsync(m => m.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<MaintenanceLogDto> CreateAsync(CreateMaintenanceLogDto dto)
        {
            var entity = new MaintenanceLog
            {
                EquipmentId = dto.EquipmentId,
                Type = string.IsNullOrWhiteSpace(dto.Type) ? "ROUTINE" : dto.Type,
                PerformedAt = dto.PerformedAt,
                PerformedBy = dto.PerformedBy,
                Cost = dto.Cost,
                Description = dto.Description,
                NextServiceDate = dto.NextServiceDate
            };
            _db.Set<MaintenanceLog>().Add(entity);

            // Bump next-service on parent equipment if provided
            if (dto.NextServiceDate.HasValue)
            {
                var eq = await _db.Set<Equipment>().FirstOrDefaultAsync(e => e.Id == dto.EquipmentId);
                if (eq != null) eq.NextServiceDate = dto.NextServiceDate;
            }

            await _db.SaveChangesAsync();

            var withNav = await _db.Set<MaintenanceLog>()
                .AsNoTracking()
                .Include(m => m.Equipment)
                .FirstAsync(m => m.Id == entity.Id);
            return Map(withNav);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<MaintenanceLog>().FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        private static MaintenanceLogDto Map(MaintenanceLog m) => new()
        {
            Id = m.Id,
            EquipmentId = m.EquipmentId,
            EquipmentName = m.Equipment?.Name,
            Type = m.Type,
            PerformedAt = m.PerformedAt,
            PerformedBy = m.PerformedBy,
            Cost = m.Cost,
            Description = m.Description,
            NextServiceDate = m.NextServiceDate
        };
    }
}
