using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserScheduleService
    {
        Task<IEnumerable<UserScheduleDto>> GetAllSchedulesAsync();
        Task<IEnumerable<UserScheduleDto>> GetSchedulesByUserIdAsync(int userId);
        Task<UserScheduleDto?> GetScheduleByIdAsync(int id);
        Task<UserScheduleDto> CreateScheduleAsync(CreateUserScheduleDto createScheduleDto);
        Task<bool> GenerateDefaultScheduleAsync(GenerateDefaultScheduleDto generateScheduleDto);
        Task<bool> DeleteScheduleAsync(int id);
        Task<bool> UpdateScheduleAsync(int id, CreateUserScheduleDto updateScheduleDto);
    }
}

