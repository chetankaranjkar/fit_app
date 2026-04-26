using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IExerciseService
    {
        Task<IEnumerable<ExerciseDto>> GetAllExercisesAsync();
        Task<PagedExercisesDto> GetPagedExercisesAsync(
            int page,
            int pageSize,
            string? search = null,
            string? difficulty = null,
            int? bodyPartId = null,
            string? sortBy = null,
            string? sortDir = null
        );
        Task<ExerciseDto?> GetExerciseByIdAsync(int id);
        Task<IEnumerable<ExerciseDto>> GetExercisesByBodyPartAsync(int bodyPartId);
        Task<ExerciseDto> CreateExerciseAsync(CreateExerciseDto createExerciseDto);
        Task<ExerciseDto?> UpdateExerciseAsync(int id, UpdateExerciseDto updateExerciseDto);
        Task<bool> DeleteExerciseAsync(int id);
    }
}

