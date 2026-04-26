using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IBodyPartMuscleService
    {
        Task<IEnumerable<BodyPartMuscleDto>> GetByBodyPartIdAsync(int bodyPartId);
        Task<BodyPartMuscleDto?> GetByIdAsync(int id);
        Task<BodyPartMuscleDto> CreateAsync(CreateBodyPartMuscleDto dto);
        Task<BodyPartMuscleDto?> UpdateAsync(int id, UpdateBodyPartMuscleDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
