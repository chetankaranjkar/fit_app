using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.GymOps
{
    public class CleaningLogService : ICleaningLogService
    {
        private readonly ApplicationDbContext _db;

        public CleaningLogService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<CleaningLogDto>> GetAllAsync()
        {
            var list = await _db.Set<CleaningLog>()
                .AsNoTracking()
                .Include(l => l.Tasks)
                .OrderByDescending(l => l.LogDate)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<CleaningLogDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<CleaningLog>()
                .AsNoTracking()
                .Include(l => l.Tasks)
                .FirstOrDefaultAsync(l => l.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<CleaningLogDto> CreateAsync(CreateCleaningLogDto dto)
        {
            var entity = new CleaningLog
            {
                LogDate = dto.LogDate,
                Area = dto.Area,
                Shift = dto.Shift,
                PerformedBy = dto.PerformedBy,
                Notes = dto.Notes,
                Tasks = dto.Tasks.Select(t => new CleaningTaskItem
                {
                    Label = t.Label,
                    IsDone = t.IsDone
                }).ToList()
            };
            _db.Set<CleaningLog>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<CleaningTaskItemDto?> UpdateTaskAsync(int logId, int taskId, UpdateCleaningTaskDto dto)
        {
            var task = await _db.Set<CleaningTaskItem>()
                .FirstOrDefaultAsync(t => t.Id == taskId && t.CleaningLogId == logId);
            if (task == null) return null;

            task.IsDone = dto.IsDone;
            await _db.SaveChangesAsync();
            return new CleaningTaskItemDto
            {
                Id = task.Id,
                Label = task.Label,
                IsDone = task.IsDone
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<CleaningLog>()
                .Include(l => l.Tasks)
                .FirstOrDefaultAsync(l => l.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            foreach (var t in entity.Tasks) t.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        private static CleaningLogDto Map(CleaningLog l) => new()
        {
            Id = l.Id,
            LogDate = l.LogDate,
            Area = l.Area,
            Shift = l.Shift,
            PerformedBy = l.PerformedBy,
            Notes = l.Notes,
            Tasks = l.Tasks
                .Where(t => !t.IsDeleted)
                .OrderBy(t => t.Id)
                .Select(t => new CleaningTaskItemDto
                {
                    Id = t.Id,
                    Label = t.Label,
                    IsDone = t.IsDone
                })
                .ToList()
        };
    }
}
