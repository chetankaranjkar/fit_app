using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IExerciseService
    {
        Task<IEnumerable<ExerciseDto>> GetAllExercisesAsync();
        Task<ExerciseDto?> GetExerciseByIdAsync(int id);
        Task<IEnumerable<ExerciseDto>> GetExercisesByBodyPartAsync(int bodyPartId);
        Task<ExerciseDto> CreateExerciseAsync(CreateExerciseDto createExerciseDto);
        Task<ExerciseDto?> UpdateExerciseAsync(int id, UpdateExerciseDto updateExerciseDto);
        Task<bool> DeleteExerciseAsync(int id);
    }
}

