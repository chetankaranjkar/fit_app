using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;

namespace GymManagement.Core.Services
{
    public interface ITrainerService
    {
        Task<TrainerStatsDto> GetTrainerStatsAsync();
        Task<PagedResultDto<TrainerDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            bool? isActive = null,
            string? sortBy = null,
            string? sortDir = null);
        Task<IEnumerable<TrainerDto>> GetAllTrainersAsync();
        Task<TrainerDto?> GetTrainerByIdAsync(int id);
        Task<TrainerDto> CreateTrainerAsync(CreateTrainerDto createTrainerDto);
        Task<TrainerDto?> UpdateTrainerAsync(int id, UpdateTrainerDto updateTrainerDto);
        Task<bool> DeleteTrainerAsync(int id);
    }
}
