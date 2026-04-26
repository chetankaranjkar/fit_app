using GymManagement.Core.DTOs.GymOps;

namespace GymManagement.Core.Services.GymOps
{
    public interface ICleaningLogService
    {
        Task<IEnumerable<CleaningLogDto>> GetAllAsync();
        Task<CleaningLogDto?> GetByIdAsync(int id);
        Task<CleaningLogDto> CreateAsync(CreateCleaningLogDto dto);
        Task<CleaningTaskItemDto?> UpdateTaskAsync(int logId, int taskId, UpdateCleaningTaskDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
