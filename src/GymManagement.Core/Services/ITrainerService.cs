using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface ITrainerService
    {
        Task<TrainerStatsDto> GetTrainerStatsAsync();
        Task<IEnumerable<TrainerDto>> GetAllTrainersAsync();
        Task<TrainerDto?> GetTrainerByIdAsync(int id);
        Task<TrainerDto> CreateTrainerAsync(CreateTrainerDto createTrainerDto);
        Task<TrainerDto?> UpdateTrainerAsync(int id, UpdateTrainerDto updateTrainerDto);
        Task<bool> DeleteTrainerAsync(int id);
    }
}
