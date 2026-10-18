using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services;
using GymManagement.Core.Services.GymOps;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.GymOps
{
    public class MaintenanceLogService : IMaintenanceLogService
    {
        private readonly ApplicationDbContext _db;
        private readonly IBranchScopeService _scope;

        public MaintenanceLogService(ApplicationDbContext db, IBranchScopeService scope)
        {
            _db = db;
            _scope = scope;
        }

        public async Task<IEnumerable<MaintenanceLogDto>> GetAllAsync()
        {
            var scope = await _scope.CurrentAsync();
            var list = await _db.Set<MaintenanceLog>()
                .AsNoTracking()
                .Include(m => m.Equipment)
                .OrderByDescending(m => m.PerformedAt)
                .ToListAsync();
            return list.Where(m => scope.Includes(m.BranchId)).Select(Map);
        }

        public async Task<MaintenanceLogDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<MaintenanceLog>()
                .AsNoTracking()
                .Include(m => m.Equipment)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null || !(await _scope.CurrentAsync()).Includes(entity.BranchId))
                return null;
            return Map(entity);
        }

        public async Task<MaintenanceLogDto> CreateAsync(CreateMaintenanceLogDto dto)
        {
            var equipment = await _db.Set<Equipment>().FirstOrDefaultAsync(e => e.Id == dto.EquipmentId);
            if (equipment == null || !(await _scope.CurrentAsync()).Includes(equipment.BranchId))
                throw new InvalidOperationException("Equipment not found.");
            var entity = new MaintenanceLog
            {
                EquipmentId = dto.EquipmentId,
                Type = string.IsNullOrWhiteSpace(dto.Type) ? "ROUTINE" : dto.Type,
                PerformedAt = dto.PerformedAt,
                PerformedBy = dto.PerformedBy,
                Cost = dto.Cost,
                Description = dto.Description,
                NextServiceDate = dto.NextServiceDate,
                BranchId = equipment?.BranchId
            };
            _db.Set<MaintenanceLog>().Add(entity);

            if (dto.NextServiceDate.HasValue && equipment != null)
                equipment.NextServiceDate = dto.NextServiceDate;

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
            if (entity == null || !(await _scope.CurrentAsync()).Includes(entity.BranchId)) return false;
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
